FROM oven/bun:1.1-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/schema/package.json ./packages/schema/

RUN bun install

# Copy source
COPY packages/types/ ./packages/types/
COPY packages/schema/ ./packages/schema/
COPY apps/api/ ./apps/api/

# Build
WORKDIR /app/apps/api
RUN bun run build

EXPOSE 3001

CMD ["bun", "run", "start"]
