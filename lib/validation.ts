import { z } from "zod";

const allowedHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function normalizeYouTubeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (!["https:"].includes(url.protocol)) return null;

    const hostname = url.hostname.toLowerCase();

    if (!allowedHosts.has(hostname)) return null;

    if (hostname.endsWith("youtu.be")) {
      if (!url.pathname || url.pathname === "/") return null;
    } else {
      const videoId = url.searchParams.get("v");
      if (!videoId && !url.pathname.startsWith("/shorts/") && !url.pathname.startsWith("/watch")) {
        return null;
      }
    }

    // Remove tracking parameters while retaining the video identifier.
    if (hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export const analyzeSchema = z.object({
  url: z.string().min(1).max(2048),
});

export const downloadSchema = z.object({
  url: z.string().min(1).max(2048),
  format: z.enum(["mp4", "mp3"]),
  quality: z.enum(["720", "1080"]).default("720"),
});

export const jobIdSchema = z.object({
  id: z.string().min(10).max(100),
});
