import { sql } from "../lib/db";

async function migrate() {
  console.log("Running migrations...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      clerk_user_id TEXT UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','hobby','pro','team','enterprise')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
      PRIMARY KEY (workspace_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      workspace_id UUID REFERENCES workspaces(id),
      source_url TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('full_page','region','multi_page')),
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
      confidence NUMERIC,
      design_md TEXT,
      tokens_json JSONB,
      components_json JSONB,
      raw_facts_json JSONB,
      screenshot_url TEXT,
      cost_cents INTEGER,
      latency_ms INTEGER,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_scans_workspace ON scans(workspace_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status) WHERE status IN ('queued','running')
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS library_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      source_url TEXT NOT NULL,
      description TEXT,
      design_md TEXT NOT NULL,
      tokens_json JSONB,
      components_json JSONB,
      is_verified BOOLEAN DEFAULT false,
      download_count INTEGER DEFAULT 0,
      tags TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_library_tags ON library_entries USING GIN (tags)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS usage_events (
      id BIGSERIAL PRIMARY KEY,
      workspace_id UUID REFERENCES workspaces(id),
      event_type TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_usage_workspace_time ON usage_events(workspace_id, created_at DESC)
  `;

  console.log("Migrations complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
