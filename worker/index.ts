import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { env } from "../lib/env";
import { DOWNLOAD_QUEUE } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { downloadMedia, getVideoInfo } from "../lib/ytdlp";

const worker = new Worker(
  DOWNLOAD_QUEUE,
  async (job) => {
    const downloadId = String(job.data.downloadId);

    const record = await prisma.download.findUnique({
      where: { id: downloadId },
    });

    if (!record) {
      throw new Error("Registro do download não encontrado.");
    }

    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: "PROCESSING",
        progress: 1,
        startedAt: new Date(),
      },
    });

    try {
      const info = await getVideoInfo(record.url);

      await prisma.download.update({
        where: { id: downloadId },
        data: {
          videoId: info.id,
          title: info.title,
          progress: 5,
        },
      });

      const result = await downloadMedia(
        record.url,
        record.format as "mp4" | "mp3",
        (record.quality ?? "720") as "720" | "1080",
        downloadId,
        async (progress) => {
          await prisma.download.update({
            where: { id: downloadId },
            data: { progress: Math.max(5, progress) },
          });
        },
      );

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.download.update({
        where: { id: downloadId },
        data: {
          status: "COMPLETED",
          progress: 100,
          filePath: result.filePath,
          fileName: result.filename,
          fileSize: BigInt(result.size),
          completedAt: new Date(),
          expiresAt,
        },
      });

      return { size: result.size };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";

      await prisma.download.update({
        where: { id: downloadId },
        data: {
          status: "FAILED",
          error: message.slice(0, 1000),
        },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY,
  },
);


async function cleanupExpiredFiles() {
  const now = new Date();

  const expired = await prisma.download.findMany({
    where: {
      expiresAt: { lt: now },
      filePath: { not: null },
    },
    select: { id: true, status: true, filePath: true },
    take: 100,
  });

  for (const item of expired) {
    try {
      const { removeJobDirectory } = await import("../lib/ytdlp");
      await removeJobDirectory(item.id);

      await prisma.download.update({
        where: { id: item.id },
        data: {
          filePath: null,
          fileName: null,
          fileSize: null,
        },
      });
    } catch (error) {
      console.error(JSON.stringify({
        event: "cleanup_failed",
        downloadId: item.id,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
}

const cleanupTimer = setInterval(() => {
  void cleanupExpiredFiles();
}, 10 * 60 * 1000);

void cleanupExpiredFiles();

worker.on("completed", (job) => {
  console.log(JSON.stringify({
    event: "job_completed",
    jobId: job.id,
  }));
});

worker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "job_failed",
    jobId: job?.id,
    error: error.message,
  }));
});

console.log(JSON.stringify({
  event: "worker_started",
  concurrency: env.WORKER_CONCURRENCY,
}));

async function shutdown(signal: string) {
  console.log(JSON.stringify({ event: "worker_shutdown", signal }));
  clearInterval(cleanupTimer);
  await worker.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
