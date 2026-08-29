import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Media Downloader",
  description: "Downloader de mídia para conteúdos autorizados",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
