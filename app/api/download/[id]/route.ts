import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    jobIdSchema.parse({ id });

    const job = await prisma.download.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        progress: true,
        error: true,
        title: true,
        format: true,
        quality: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Download não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      title: job.title,
      format: job.format,
      quality: job.quality,
      downloadUrl:
        job.status === "COMPLETED"
          ? `/api/download/${job.id}/file`
          : null,
    });
  } catch {
    return NextResponse.json(
      { error: "ID inválido." },
      { status: 400 },
    );
  }
}
