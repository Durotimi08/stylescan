import { Hono } from "hono";
import { z } from "zod";
import { sql } from "../lib/db";
import { scanQueue } from "../lib/queue";
import { incrementScanCount } from "../middleware/rate-limit";
import type { ScanJob } from "@stylescan/types";

export const scanRoutes = new Hono();

const ScanRequestSchema = z.object({
  sourceUrl: z.string().url(),
  mode: z.enum(["full_page", "region", "multi_page"]).default("full_page"),
});

// POST /scans — Create a new scan
scanRoutes.post("/", async (c) => {
  const auth = c.get("auth");
  const contentType = c.req.header("content-type") ?? "";

  let sourceUrl: string;
  let mode: string;
  let extraction: unknown = null;
  let screenshotUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    // Extension sends multipart with extraction + screenshot
    const formData = await c.req.formData();
    const extractionRaw = formData.get("extraction");
    const screenshot = formData.get("screenshot") as File | null;
    const modeRaw = formData.get("mode") as string | null;

    if (!extractionRaw) {
      return c.json({ error: "Missing extraction data" }, 400);
    }

    extraction = JSON.parse(extractionRaw as string);
    sourceUrl = (extraction as { url: string }).url;
    mode = modeRaw ?? "full_page";

    // Convert screenshot to base64 data URL for LLM consumption
    if (screenshot) {
      const buffer = await screenshot.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      screenshotUrl = `data:image/png;base64,${base64}`;
    }
  } else {
    // JSON body — URL-only scan (server will crawl)
    const body = await c.req.json();
    const parsed = ScanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
    }
    sourceUrl = parsed.data.sourceUrl;
    mode = parsed.data.mode;
  }

  // Create scan record
  const [scan] = await sql`
    INSERT INTO scans (user_id, workspace_id, source_url, mode, status)
    VALUES (${auth.userId}, ${auth.workspaceId}, ${sourceUrl}, ${mode}, 'queued')
    RETURNING id, status, created_at
  `;

  // Increment usage counter
  await incrementScanCount(auth.userId);

  // Enqueue the scan job
  const jobPayload: ScanJob = {
    scanId: scan.id,
    userId: auth.userId,
    sourceUrl,
    mode: mode as ScanJob["mode"],
    extraction: extraction as ScanJob["extraction"],
    screenshotUrl: screenshotUrl ?? "",
  };

  await scanQueue.add(`scan-${scan.id}`, jobPayload, {
    priority: auth.plan === "free" ? 10 : 1,
  });

  return c.json(
    {
      scanId: scan.id,
      status: "queued",
      estimatedMs: mode === "multi_page" ? 60000 : 30000,
    },
    202
  );
});

// GET /scans — List user's scans
scanRoutes.get("/", async (c) => {
  const auth = c.get("auth");
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const scans = await sql`
    SELECT id, source_url, mode, status, confidence, cost_cents, latency_ms,
           created_at, completed_at
    FROM scans
    WHERE user_id = ${auth.userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql`
    SELECT count(*)::int FROM scans WHERE user_id = ${auth.userId}
  `;

  return c.json({ scans, total: count, limit, offset });
});

// GET /scans/:id — Get scan details
scanRoutes.get("/:id", async (c) => {
  const auth = c.get("auth");
  const scanId = c.req.param("id");

  const [scan] = await sql`
    SELECT * FROM scans
    WHERE id = ${scanId} AND user_id = ${auth.userId}
  `;

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  return c.json(scan);
});

// GET /scans/:id/design.md — Download design.md
scanRoutes.get("/:id/design.md", async (c) => {
  const auth = c.get("auth");
  const scanId = c.req.param("id");

  const [scan] = await sql`
    SELECT design_md, status FROM scans
    WHERE id = ${scanId} AND user_id = ${auth.userId}
  `;

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  if (scan.status !== "complete") {
    return c.json({ error: "Scan not yet complete", status: scan.status }, 409);
  }

  if (!scan.design_md) {
    return c.json({ error: "No design.md available" }, 404);
  }

  c.header("Content-Type", "text/markdown; charset=utf-8");
  c.header(
    "Content-Disposition",
    `attachment; filename="design.md"`
  );

  return c.body(scan.design_md);
});

// GET /scans/:id/tokens.json — Download design tokens
scanRoutes.get("/:id/tokens.json", async (c) => {
  const auth = c.get("auth");
  const scanId = c.req.param("id");

  const [scan] = await sql`
    SELECT tokens_json, status FROM scans
    WHERE id = ${scanId} AND user_id = ${auth.userId}
  `;

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  if (scan.status !== "complete") {
    return c.json({ error: "Scan not yet complete", status: scan.status }, 409);
  }

  if (!scan.tokens_json) {
    return c.json({ error: "No tokens available" }, 404);
  }

  c.header("Content-Type", "application/json; charset=utf-8");
  c.header(
    "Content-Disposition",
    `attachment; filename="tokens.json"`
  );

  return c.json(scan.tokens_json);
});

// GET /scans/:id/components.json — Download component patterns
scanRoutes.get("/:id/components.json", async (c) => {
  const auth = c.get("auth");
  const scanId = c.req.param("id");

  const [scan] = await sql`
    SELECT components_json, status FROM scans
    WHERE id = ${scanId} AND user_id = ${auth.userId}
  `;

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  if (scan.status !== "complete") {
    return c.json({ error: "Scan not yet complete", status: scan.status }, 409);
  }

  if (!scan.components_json) {
    return c.json({ error: "No components available" }, 404);
  }

  c.header("Content-Type", "application/json; charset=utf-8");
  c.header(
    "Content-Disposition",
    `attachment; filename="components.json"`
  );

  return c.json(scan.components_json);
});
