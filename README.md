# StyleScan

Extract the design language of any webpage into a `design.md` file that AI coding agents can consume as a styling backbone.

## What it does

1. Visit any website you like
2. Click the StyleScan extension or paste a URL in the dashboard
3. Get a structured `design.md` + `tokens.json` with colors, typography, spacing, components, and anti-patterns
4. Drop it into your AI coding agent's context — Cursor, Claude Code, v0, Lovable, Windsurf, etc.
5. Your agent now produces UI that matches the reference aesthetic

## Architecture

```
stylescan/
├── apps/
│   ├── api/          — Hono API server (auth, scan queue, billing webhooks)
│   ├── worker/       — Scan pipeline (Playwright crawler, CSS clustering, LLM distillation)
│   ├── extension/    — Chrome extension (WXT + React)
│   └── web/          — Next.js dashboard + landing page
├── packages/
│   ├── types/        — Shared TypeScript types
│   ├── schema/       — Zod validators + design.md serializer
│   ├── extractor/    — DOM/CSS extraction + color/font/spacing clustering
│   ├── distiller/    — LLM prompt templates + vision/synthesis pipeline
│   └── ui/           — Shared React components
├── tooling/          — Shared tsconfig + ESLint
└── prompts/          — Versioned prompt files
```

## Tech stack

- **Monorepo**: Turborepo + pnpm
- **API**: Hono + Node.js
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL
- **Browser automation**: Playwright
- **LLM**: OpenAI GPT-4o (vision + synthesis)
- **Auth**: Clerk
- **Extension**: WXT + React + Tailwind
- **Web**: Next.js 15 + Tailwind

## Getting started

```bash
# Install dependencies
pnpm install

# Copy env and fill in your keys
cp .env.example .env

# Start Postgres + Redis
docker compose up postgres redis -d

# Run database migrations
pnpm --filter @stylescan/api db:migrate
pnpm --filter @stylescan/api db:seed

# Install Playwright browsers
cd apps/worker && pnpm exec playwright install chromium && cd ../..

# Start all services
pnpm dev
```

- Web app: http://localhost:3000
- API: http://localhost:3001
- Extension: auto-loaded by WXT in Chrome

## Fidelity testing

Run the end-to-end design fidelity test against any site:

```bash
cd apps/worker
pnpm test:fidelity https://example.com
```

This crawls the site, extracts a design.md, asks GPT-4o to build a completely different website (education platform) using only the design.md, then scores how well the design language transferred. Results saved to `test-results/`.

## License

See [LICENSE](LICENSE).
