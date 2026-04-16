import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { sql } from "../lib/db";

export interface AuthContext {
  userId: string;
  email: string;
  plan: string;
  workspaceId: string | null;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

// Clerk JWKS endpoint — cached automatically by jose
const CLERK_ISSUER = process.env.CLERK_ISSUER_URL;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    if (!CLERK_ISSUER) {
      throw new Error("CLERK_ISSUER_URL not set — cannot verify JWTs");
    }
    jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`));
  }
  return jwks;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  // Check if it's an API key (starts with sk_)
  if (token.startsWith("sk_")) {
    return handleApiKeyAuth(c, token, next);
  }

  // Otherwise treat as Clerk JWT
  return handleClerkAuth(c, token, next);
});

async function handleClerkAuth(c: any, token: string, next: () => Promise<void>) {
  try {
    let clerkUserId: string;
    let email: string;

    if (CLERK_ISSUER) {
      // Production: verify JWT signature via Clerk's JWKS
      const { payload } = await jwtVerify(token, getJWKS(), {
        issuer: CLERK_ISSUER,
      });

      clerkUserId = payload.sub!;
      email = (payload as any).email ?? (payload as any).email_address ?? `${clerkUserId}@clerk.user`;
    } else {
      // Development fallback: decode without verification (only when CLERK_ISSUER_URL is not set)
      console.warn("[AUTH] CLERK_ISSUER_URL not set — skipping JWT signature verification (dev mode only)");
      const parts = token.split(".");
      if (parts.length !== 3) {
        return c.json({ error: "Invalid token format" }, 401);
      }
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      clerkUserId = payload.sub;
      email = payload.email ?? payload.email_address ?? `${clerkUserId}@clerk.user`;
    }

    if (!clerkUserId) {
      return c.json({ error: "Invalid token: missing sub" }, 401);
    }

    // Look up or auto-create user
    let [user] = await sql`
      SELECT id, email, plan FROM users WHERE clerk_user_id = ${clerkUserId}
    `;

    if (!user) {
      [user] = await sql`
        INSERT INTO users (email, clerk_user_id, plan)
        VALUES (${email}, ${clerkUserId}, 'free')
        ON CONFLICT (clerk_user_id) DO UPDATE SET email = ${email}
        RETURNING id, email, plan
      `;
    }

    c.set("auth", {
      userId: user.id,
      email: user.email,
      plan: user.plan,
      workspaceId: null,
    });

    await next();
  } catch (err) {
    console.error("Auth error:", (err as Error).message);
    return c.json({ error: "Authentication failed" }, 401);
  }
}

async function handleApiKeyAuth(c: any, apiKey: string, next: () => Promise<void>) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const [result] = await sql`
      SELECT ak.workspace_id, w.owner_id, u.email, u.plan
      FROM api_keys ak
      JOIN workspaces w ON w.id = ak.workspace_id
      JOIN users u ON u.id = w.owner_id
      WHERE ak.key_hash = ${keyHash}
    `;

    if (!result) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    await sql`
      UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ${keyHash}
    `;

    c.set("auth", {
      userId: result.owner_id,
      email: result.email,
      plan: result.plan,
      workspaceId: result.workspace_id,
    });

    await next();
  } catch (err) {
    console.error("API key auth error:", (err as Error).message);
    return c.json({ error: "Authentication failed" }, 401);
  }
}
