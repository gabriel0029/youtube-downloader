import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  YTDLP_PATH: z.string().default("/usr/local/bin/yt-dlp"),
  DOWNLOAD_DIR: z.string().default("/app/downloads"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  MAX_DOWNLOAD_BYTES: z.coerce.number().int().positive().default(524288000),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

function loadEnv(): Env {
  if (!cached) {
    cached = envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      YTDLP_PATH: process.env.YTDLP_PATH,
      DOWNLOAD_DIR: process.env.DOWNLOAD_DIR,
      WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
      MAX_DOWNLOAD_BYTES: process.env.MAX_DOWNLOAD_BYTES,
    });
  }
  return cached;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    return loadEnv()[prop];
  },
});