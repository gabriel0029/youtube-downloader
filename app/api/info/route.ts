import { NextRequest, NextResponse } from "next/server";
import { analyzeSchema, normalizeYouTubeUrl } from "@/lib/validation";
import { getVideoInfo } from "@/lib/ytdlp";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function formatDuration(seconds = 0) {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`info:${ip}`, 5, 60);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de análises atingido. Tente novamente em instantes." },
      { status: 429 },
    );
  }

  try {
    const body = analyzeSchema.parse(await request.json());
    const url = normalizeYouTubeUrl(body.url);

    if (!url) {
      return NextResponse.json(
        { error: "Informe uma URL HTTPS válida do YouTube." },
        { status: 400 },
      );
    }

    const info = await getVideoInfo(url);

    return NextResponse.json({
      id: info.id,
      title: info.title,
      channel: info.channel || info.uploader || "Canal desconhecido",
      duration: info.duration ?? null,
      durationFormatted: formatDuration(info.duration),
      thumbnail: info.thumbnail ?? null,
      webpageUrl: info.webpage_url,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "media_info_error",
      error: error instanceof Error ? error.message : String(error),
    }));

    return NextResponse.json(
      {
        error:
          "Não foi possível analisar o conteúdo. Ele pode estar indisponível, restrito ou não ser compatível.",
      },
      { status: 422 },
    );
  }
}
