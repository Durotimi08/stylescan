import "dotenv/config";
import { Worker } from "bullmq";
import type { ScanJob } from "@stylescan/types";
import { runScanPipeline } from "./pipeline";
import { sql } from "./db";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6380", 10),
};

const worker = new Worker<ScanJob>(
  "scan-pipeline",
  async (job) => {
    const startTime = Date.now();
    const { scanId } = job.data;

    console.log(`[${scanId}] Starting scan pipeline for ${job.data.sourceUrl}`);

    // Mark as running
    await sql`
      UPDATE scans SET status = 'running' WHERE id = ${scanId}
    `;

    try {
      const result = await runScanPipeline(job.data);
      const latencyMs = Date.now() - startTime;

      // Estimate cost in cents (based on ~$0.15/scan = 15 cents)
      const costCents = 15;

      await sql`
        UPDATE scans SET
          status = 'complete',
          design_md = ${result.designMd},
          tokens_json = ${JSON.stringify(result.tokensJson)},
          components_json = ${JSON.stringify(result.componentsJson)},
          raw_facts_json = ${JSON.stringify(result.rawFacts)},
          confidence = ${result.confidence},
          cost_cents = ${costCents},
          latency_ms = ${latencyMs},
          completed_at = NOW()
        WHERE id = ${scanId}
      `;

      console.log(
        `[${scanId}] Complete. Confidence: ${result.confidence}, Latency: ${latencyMs}ms`
      );

      return result;
    } catch (err) {
      const error = err as Error;
      console.error(`[${scanId}] Failed:`, error.message);

      await sql`
        UPDATE scans SET
          status = 'failed',
          error = ${error.message},
          latency_ms = ${Date.now() - startTime},
          completed_at = NOW()
        WHERE id = ${scanId}
      `;

      throw err;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("StyleScan worker started. Waiting for jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await worker.close();
  process.exit(0);
});
