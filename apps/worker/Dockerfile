FROM oven/bun:1.1-alpine AS base

# Install Playwright system deps
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/schema/package.json ./packages/schema/
COPY packages/extractor/package.json ./packages/extractor/
COPY packages/distiller/package.json ./packages/distiller/

RUN bun install

# Copy source
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Build
WORKDIR /app/apps/worker
RUN bun run build

CMD ["bun", "run", "start"]
