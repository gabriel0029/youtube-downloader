import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

export interface ExtractedInfo {
  id: string;
  title: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url: string;
}

function run(
  args: string[],
  timeoutMs: number,
  onProgress?: (percent: number) => void,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.YTDLP_PATH, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        HOME: "/tmp",
      },
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        child.kill("SIGKILL");
        reject(new Error("Operação excedeu o tempo limite."));
      }
    }, timeoutMs);

    const finish = (fn: () => void) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      fn();
    };

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;

      for (const line of chunk.split(/\r?\n/)) {
        const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (match) {
          onProgress?.(Math.min(99, Math.floor(Number(match[1]))));
        }
      }
    });

    child.on("error", (error) => finish(() => reject(error)));

    child.on("close", (code) => {
      if (code === 0) {
        finish(() => resolve({ stdout, stderr }));
      } else {
        finish(() =>
          reject(new Error(stderr.trim() || `yt-dlp exited with ${code}`)),
        );
      }
    });
  });
}

export async function getVideoInfo(url: string): Promise<ExtractedInfo> {
  const { stdout, stderr } = await run(
    [
      "--dump-single-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      url,
    ],
    30_000,
  );

  try {
    const data = JSON.parse(stdout);
    return {
      id: String(data.id),
      title: String(data.title),
      channel: data.channel,
      uploader: data.uploader,
      duration: typeof data.duration === "number" ? data.duration : undefined,
      thumbnail: data.thumbnail,
      webpage_url: String(data.webpage_url),
    };
  } catch {
    throw new Error(stderr || "Não foi possível interpretar os metadados.");
  }
}

export async function downloadMedia(
  url: string,
  format: "mp4" | "mp3",
  quality: "720" | "1080",
  jobId: string,
  onProgress: (percent: number) => Promise<void>,
): Promise<{ filePath: string; filename: string; size: number }> {
  const jobDir = path.join(env.DOWNLOAD_DIR, jobId);
  await mkdir(jobDir, { recursive: true });

  const template = path.join(jobDir, "%(id)s.%(ext)s");

  const formatSelector =
    format === "mp3"
      ? "bestaudio/best"
      : quality === "1080"
        ? "bestvideo[height<=1080]+bestaudio/best[height<=1080]"
        : "bestvideo[height<=720]+bestaudio/best[height<=720]";

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--restrict-filenames",
    "--newline",
    "--progress",
    "--socket-timeout",
    "20",
    "--retries",
    "2",
    "-f",
    formatSelector,
    "-o",
    template,
  ];

  if (format === "mp3") {
    args.push(
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
    );
  } else {
    args.push("--merge-output-format", "mp4");
  }

  args.push(url);

  await run(args, 10 * 60_000, async (percent) => {
    await onProgress(percent);
  });

  const files = (await readdir(jobDir)).filter(
    (file) => !file.endsWith(".part") && !file.endsWith(".ytdl"),
  );

  if (!files.length) {
    throw new Error("Nenhum arquivo foi gerado.");
  }

  const fileName = files.find((file) =>
    format === "mp3" ? file.endsWith(".mp3") : file.endsWith(".mp4"),
  ) ?? files[0];

  const filePath = path.join(jobDir, fileName);
  const fileStat = await stat(filePath);

  if (fileStat.size > env.MAX_DOWNLOAD_BYTES) {
    await rm(jobDir, { recursive: true, force: true });
    throw new Error("O arquivo excede o limite permitido.");
  }

  return {
    filePath,
    filename: fileName,
    size: fileStat.size,
  };
}

export async function removeJobDirectory(jobId: string) {
  await rm(path.join(env.DOWNLOAD_DIR, jobId), {
    recursive: true,
    force: true,
  });
}

export { createReadStream };
