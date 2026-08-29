"use client";

import { useEffect, useState } from "react";

type Format = "mp4" | "mp3";
type Quality = "720" | "1080";

interface Info {
  id: string;
  title: string;
  channel: string;
  durationFormatted: string;
  thumbnail: string | null;
}

interface Job {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  error: string | null;
  title: string | null;
  downloadUrl: string | null;
}

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<Info | null>(null);
  const [format, setFormat] = useState<Format>("mp4");
  const [quality, setQuality] = useState<Quality>("720");
  const [analyzing, setAnalyzing] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!job || !["PENDING", "PROCESSING"].includes(job.status)) return;

    const timer = setInterval(async () => {
      const response = await fetch(`/api/download/${job.id}`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      setJob(data);
    }, 1500);

    return () => clearInterval(timer);
  }, [job]);

  async function analyze() {
    setError("");
    setInfo(null);
    setJob(null);

    if (!url.trim()) {
      setError("Cole uma URL do YouTube.");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setInfo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao analisar.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function startDownload() {
    setError("");
    setJob(null);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format, quality }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setJob({
        id: data.id,
        status: data.status,
        progress: 0,
        error: null,
        title: info?.title ?? null,
        downloadUrl: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar download.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              MVP • Docker • Redis • PostgreSQL
            </p>
            <h1 className="mt-1 text-3xl font-bold">Media Downloader</h1>
          </div>

          <button
            onClick={() => setDark((v) => !v)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
            aria-label="Alternar tema"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void analyze();
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="h-12 flex-1 rounded-xl border border-slate-300 bg-transparent px-4 outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
            />

            <button
              onClick={() => void analyze()}
              disabled={analyzing}
              className="h-12 rounded-xl bg-slate-900 px-6 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {analyzing ? "Analisando..." : "Buscar"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Use somente conteúdos cujo download e uso sejam autorizados.
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
        </section>

        {info && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {info.thumbnail && (
              <img
                src={info.thumbnail}
                alt=""
                className="aspect-video w-full object-cover"
              />
            )}

            <div className="p-5">
              <h2 className="text-xl font-semibold">{info.title}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {info.channel} • {info.durationFormatted}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Formato
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as Format)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 dark:border-slate-700"
                  >
                    <option value="mp4">MP4 — vídeo</option>
                    <option value="mp3">MP3 — áudio</option>
                  </select>
                </label>

                {format === "mp4" && (
                  <label className="text-sm font-medium">
                    Qualidade
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as Quality)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 dark:border-slate-700"
                    >
                      <option value="720">720p</option>
                      <option value="1080">1080p</option>
                    </select>
                  </label>
                )}
              </div>

              <button
                onClick={() => void startDownload()}
                disabled={!!job && ["PENDING", "PROCESSING"].includes(job.status)}
                className="mt-6 h-12 w-full rounded-xl bg-slate-900 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {job?.status === "PROCESSING"
                  ? `Processando ${job.progress}%`
                  : job?.status === "PENDING"
                    ? "Na fila..."
                    : `Gerar ${format.toUpperCase()}`}
              </button>
            </div>
          </section>
        )}

        {job && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-sm">
              <span>
                {job.status === "PENDING" && "Aguardando na fila"}
                {job.status === "PROCESSING" && "Processando mídia"}
                {job.status === "COMPLETED" && "Pronto"}
                {job.status === "FAILED" && "Falhou"}
              </span>
              <span>{job.progress}%</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-900 transition-all dark:bg-white"
                style={{ width: `${job.progress}%` }}
              />
            </div>

            {job.status === "COMPLETED" && job.downloadUrl && (
              <a
                href={job.downloadUrl}
                className="mt-5 block rounded-xl bg-emerald-600 px-5 py-3 text-center font-medium text-white"
              >
                Baixar arquivo
              </a>
            )}

            {job.status === "FAILED" && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {job.error || "Não foi possível concluir o download."}
              </p>
            )}
          </section>
        )}

        <footer className="mt-auto pt-10 text-center text-xs text-slate-500">
          Arquivos temporários expiram após 1 hora.
        </footer>
      </div>
    </main>
  );
}
