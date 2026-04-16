import { Hono } from "hono";
import { sql } from "../lib/db";
import { redis } from "../lib/redis";
import { PLAN_LIMITS } from "@stylescan/types";
import type { Plan } from "@stylescan/types";

export const userRoutes = new Hono();

// GET /users/me — Get current user profile
userRoutes.get("/me", async (c) => {
  const auth = c.get("auth");

  const [user] = await sql`
    SELECT id, email, plan, created_at FROM users WHERE id = ${auth.userId}
  `;

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Get usage stats
  const monthKey = new Date().toISOString().slice(0, 7);
  const redisKey = `ratelimit:${auth.userId}:${monthKey}`;
  const scanCount = parseInt((await redis.get(redisKey)) ?? "0", 10);
  const limits = PLAN_LIMITS[user.plan as Plan];

  return c.json({
    ...user,
    usage: {
      scansThisMonth: scanCount,
      scansLimit: limits.scansPerMonth,
      scansRemaining: Math.max(0, limits.scansPerMonth - scanCount),
    },
  });
});

// GET /users/me/workspaces — List user's workspaces
userRoutes.get("/me/workspaces", async (c) => {
  const auth = c.get("auth");

  const workspaces = await sql`
    SELECT w.id, w.name, w.plan, w.created_at, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ${auth.userId}
    ORDER BY w.created_at DESC
  `;

  return c.json({ workspaces });
});

// POST /users/me/api-keys — Create an API key
userRoutes.post("/me/api-keys", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const name = body.name ?? "Default";

  // Generate a random API key
  const rawKey = `sk_${crypto.randomUUID().replace(/-/g, "")}`;

  // Hash it for storage
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Get or create workspace
  let workspaceId = auth.workspaceId;
  if (!workspaceId) {
    const [workspace] = await sql`
      SELECT w.id FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ${auth.userId}
      LIMIT 1
    `;

    if (!workspace) {
      // Create a default workspace
      const [newWorkspace] = await sql`
        INSERT INTO workspaces (name, owner_id, plan)
        VALUES ('Default', ${auth.userId}, ${auth.plan})
        RETURNING id
      `;
      workspaceId = newWorkspace.id;

      await sql`
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (${workspaceId}, ${auth.userId}, 'owner')
      `;
    } else {
      workspaceId = workspace.id;
    }
  }

  const [apiKey] = await sql`
    INSERT INTO api_keys (workspace_id, name, key_hash)
    VALUES (${workspaceId}, ${name}, ${keyHash})
    RETURNING id, name, created_at
  `;

  // Return the raw key only once — it can't be retrieved later
  return c.json({
    ...apiKey,
    key: rawKey,
    warning: "Store this key securely. It cannot be retrieved later.",
  }, 201);
});

// GET /users/me/api-keys — List API keys
userRoutes.get("/me/api-keys", async (c) => {
  const auth = c.get("auth");

  const keys = await sql`
    SELECT ak.id, ak.name, ak.last_used_at, ak.created_at
    FROM api_keys ak
    JOIN workspaces w ON w.id = ak.workspace_id
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ${auth.userId}
    ORDER BY ak.created_at DESC
  `;

  return c.json({ keys });
});

// DELETE /users/me/api-keys/:id — Delete an API key
userRoutes.delete("/me/api-keys/:id", async (c) => {
  const auth = c.get("auth");
  const keyId = c.req.param("id");

  const result = await sql`
    DELETE FROM api_keys
    WHERE id = ${keyId}
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = ${auth.userId}
    )
    RETURNING id
  `;

  if (result.length === 0) {
    return c.json({ error: "API key not found" }, 404);
  }

  return c.json({ deleted: true });
});
