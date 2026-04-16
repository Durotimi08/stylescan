import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { scanRoutes } from "./routes/scans";
import { webhookRoutes } from "./routes/webhooks";
import { userRoutes } from "./routes/users";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";

const app = new Hono();

// Global middleware
app.use("*", logger());
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,https://stylescan.dev")
  .split(",")
  .map((o) => o.trim());

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0];
      if (allowedOrigins.includes(origin)) return origin;
      // Allow specific extension ID if set, otherwise block
      const extId = process.env.EXTENSION_ID;
      if (extId && origin === `chrome-extension://${extId}`) return origin;
      return null as unknown as string;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Stripe webhooks (must be before auth middleware — needs raw body)
app.route("/webhooks", webhookRoutes);

// Protected routes
app.use("/scan/*", authMiddleware);
app.use("/scans/*", authMiddleware);
app.use("/users/*", authMiddleware);

app.use("/scan/*", rateLimitMiddleware);
app.use("/scans/*", rateLimitMiddleware);

app.route("/scans", scanRoutes);
app.route("/users", userRoutes);

// 404
app.notFound((c) =>
  c.json({ error: "Not found", path: c.req.path }, 404)
);

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  const isDev = process.env.NODE_ENV !== "production";
  return c.json(
    {
      error: "Internal server error",
      ...(isDev ? { message: err.message } : {}),
    },
    500
  );
});

const port = parseInt(process.env.PORT ?? "3001", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`StyleScan API running on http://localhost:${port}`);
});
