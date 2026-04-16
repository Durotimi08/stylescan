import { sql } from "../lib/db";

async function seed() {
  console.log("Seeding database...");

  // Create a test user
  const [user] = await sql`
    INSERT INTO users (email, plan)
    VALUES ('test@stylescan.dev', 'pro')
    ON CONFLICT (email) DO UPDATE SET plan = 'pro'
    RETURNING id
  `;

  // Create a workspace
  const [workspace] = await sql`
    INSERT INTO workspaces (name, owner_id, plan)
    VALUES ('Default Workspace', ${user.id}, 'pro')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  if (workspace) {
    await sql`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (${workspace.id}, ${user.id}, 'owner')
      ON CONFLICT DO NOTHING
    `;
  }

  // Seed some library entries
  const libraryEntries = [
    {
      slug: "linear-app-v1",
      title: "Linear.app",
      sourceUrl: "https://linear.app",
      description: "Minimalist, dark-forward, precision-engineered project management tool.",
      tags: ["saas", "dark", "minimalist", "productivity"],
    },
    {
      slug: "stripe-dashboard-v1",
      title: "Stripe Dashboard",
      sourceUrl: "https://dashboard.stripe.com",
      description: "Clean, professional fintech dashboard with excellent data density.",
      tags: ["saas", "light", "fintech", "dashboard"],
    },
    {
      slug: "vercel-v1",
      title: "Vercel",
      sourceUrl: "https://vercel.com",
      description: "Sharp, monochrome developer platform with bold typography.",
      tags: ["devtools", "dark", "monochrome", "developer"],
    },
    {
      slug: "notion-v1",
      title: "Notion",
      sourceUrl: "https://notion.so",
      description: "Warm, approachable productivity tool with generous whitespace.",
      tags: ["saas", "light", "warm", "productivity"],
    },
    {
      slug: "arc-browser-v1",
      title: "Arc Browser",
      sourceUrl: "https://arc.net",
      description: "Playful, colorful browser landing with bold gradients and personality.",
      tags: ["consumer", "colorful", "playful", "browser"],
    },
  ];

  for (const entry of libraryEntries) {
    await sql`
      INSERT INTO library_entries (slug, title, source_url, description, design_md, is_verified, tags)
      VALUES (
        ${entry.slug},
        ${entry.title},
        ${entry.sourceUrl},
        ${entry.description},
        ${"# Placeholder — run a scan to generate the real design.md"},
        false,
        ${entry.tags}
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
