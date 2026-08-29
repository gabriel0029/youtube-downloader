import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { createReadStream } from "@/lib/ytdlp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const job = await prisma.download.findUnique({
    where: { id },
    select: {
      status: true,
      filePath: true,
      fileName: true,
      fileSize: true,
      expiresAt: true,
      format: true,
    },
  });

  if (!job || job.status !== "COMPLETED" || !job.filePath || !job.fileName) {
    return NextResponse.json(
      { error: "Arquivo não está disponível." },
      { status: 404 },
    );
  }

  if (job.expiresAt && job.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Este download expirou." },
      { status: 410 },
    );
  }

  try {
    const fileStat = await stat(job.filePath);
    const stream = Readable.toWeb(createReadStream(job.filePath)) as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": job.format === "mp3" ? "audio/mpeg" : "video/mp4",
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `attachment; filename="${job.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Arquivo não encontrado no armazenamento." },
      { status: 404 },
    );
  }
}
