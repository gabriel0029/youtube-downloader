FROM node:22-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       ca-certificates \
       curl \
       tini \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L \
    https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp_linux \
    -o /usr/local/bin/yt-dlp \
    && chmod 0755 /usr/local/bin/yt-dlp

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN useradd --system --uid 1001 --create-home nextjs

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types

RUN mkdir -p /app/downloads \
    && chown -R nextjs:nextjs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["node", "server.js"]
