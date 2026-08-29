export type DownloadFormat = "mp4" | "mp3";
export type VideoQuality = "720" | "1080";

export interface MediaInfo {
  id: string;
  title: string;
  channel: string;
  duration: number | null;
  durationFormatted: string;
  thumbnail: string | null;
  webpageUrl: string;
}

export interface JobStatus {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  error: string | null;
  title: string | null;
  format: DownloadFormat;
  quality: VideoQuality | null;
}
