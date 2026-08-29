import IORedis from "ioredis";
import { env } from "./env";

declare global {
  var __redis: IORedis | undefined;
}

function createRedisClient(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

function getRedis(): IORedis {
  if (!global.__redis) {
    global.__redis = createRedisClient();
  }
  return global.__redis;
}

export const redis = new Proxy({} as IORedis, {
  get(_target, prop) {
    return Reflect.get(getRedis(), prop);
  },
});

if (process.env.NODE_ENV !== "production") {
  global.__redis = global.__redis ?? getRedis();
}