-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "videoId" TEXT,
    "title" TEXT,
    "format" TEXT NOT NULL,
    "quality" TEXT,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT,
    "fileName" TEXT,
    "fileSize" BIGINT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Download_status_idx" ON "Download"("status");
CREATE INDEX "Download_createdAt_idx" ON "Download"("createdAt");
