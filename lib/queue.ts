import { Queue } from "bullmq";
import { redis } from "./redis";

export const DOWNLOAD_QUEUE = "media-downloads";

declare global {
  var __downloadQueue: Queue | undefined;
}

function createQueue(): Queue {
  return new Queue(DOWNLOAD_QUEUE, {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 2000,
    },
  });
}

function getQueue(): Queue {
  if (!global.__downloadQueue) {
    global.__downloadQueue = createQueue();
  }
  return global.__downloadQueue;
}

export const downloadQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return Reflect.get(getQueue(), prop);
  },
});