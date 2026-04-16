import { createMiddleware } from "hono/factory";
import { redis } from "../lib/redis";
import { PLAN_LIMITS } from "@stylescan/types";
import type { Plan } from "@stylescan/types";

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const auth = c.get("auth");
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const plan = auth.plan as Plan;
  const limits = PLAN_LIMITS[plan];
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const redisKey = `ratelimit:${auth.userId}:${monthKey}`;

  const currentCount = await redis.get(redisKey);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= limits.scansPerMonth) {
    return c.json(
      {
        error: "Monthly scan limit reached",
        limit: limits.scansPerMonth,
        used: count,
        plan: auth.plan,
        upgradeUrl: "https://stylescan.dev/pricing",
      },
      429
    );
  }

  // Set headers for the client
  c.header("X-RateLimit-Limit", String(limits.scansPerMonth));
  c.header("X-RateLimit-Remaining", String(limits.scansPerMonth - count - 1));
  c.header("X-RateLimit-Reset", getEndOfMonth());

  await next();
});

function getEndOfMonth(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return end.toISOString();
}

export async function incrementScanCount(userId: string): Promise<void> {
  const monthKey = new Date().toISOString().slice(0, 7);
  const redisKey = `ratelimit:${userId}:${monthKey}`;

  const multi = redis.multi();
  multi.incr(redisKey);
  // Expire at end of month + 1 day buffer
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  multi.expire(redisKey, (daysInMonth + 1) * 86400);
  await multi.exec();
}
