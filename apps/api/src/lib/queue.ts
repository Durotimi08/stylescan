import { Queue } from "bullmq";
import type { ScanJob } from "@stylescan/types";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6380", 10),
};

export const scanQueue = new Queue<ScanJob>("scan-pipeline", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});
