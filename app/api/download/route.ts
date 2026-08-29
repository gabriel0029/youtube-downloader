import { NextRequest, NextResponse } from "next/server";
import { downloadSchema, normalizeYouTubeUrl } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { downloadQueue } from "@/lib/queue";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`download:${ip}`, 2, 60);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de downloads atingido. Tente novamente em instantes." },
      { status: 429 },
    );
  }

  try {
    const body = downloadSchema.parse(await request.json());
    const url = normalizeYouTubeUrl(body.url);

    if (!url) {
      return NextResponse.json(
        { error: "URL do YouTube inválida." },
        { status: 400 },
      );
    }

    const job = await prisma.download.create({
      data: {
        url,
        format: body.format,
        quality: body.format === "mp4" ? body.quality : null,
      },
    });

    await downloadQueue.add(
      "download",
      { downloadId: job.id },
      { jobId: job.id },
    );

    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "download_enqueue_error",
      error: error instanceof Error ? error.message : String(error),
    }));

    return NextResponse.json(
      { error: "Não foi possível criar o download." },
      { status: 400 },
    );
  }
}
