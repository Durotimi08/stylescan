import { Hono } from "hono";
import { sql } from "../lib/db";

export const libraryRoutes = new Hono();

// GET /library — Browse curated library
libraryRoutes.get("/", async (c) => {
  const tag = c.req.query("tag");
  const search = c.req.query("q");
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  let entries;
  let total: number;

  if (tag) {
    entries = await sql`
      SELECT id, slug, title, source_url, description, is_verified,
             download_count, tags, created_at, updated_at
      FROM library_entries
      WHERE ${tag} = ANY(tags)
      ORDER BY download_count DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ count }] = await sql`
      SELECT count(*)::int FROM library_entries WHERE ${tag} = ANY(tags)
    `;
    total = count;
  } else if (search) {
    entries = await sql`
      SELECT id, slug, title, source_url, description, is_verified,
             download_count, tags, created_at, updated_at
      FROM library_entries
      WHERE title ILIKE ${"%" + search + "%"}
         OR description ILIKE ${"%" + search + "%"}
      ORDER BY download_count DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ count }] = await sql`
      SELECT count(*)::int FROM library_entries
      WHERE title ILIKE ${"%" + search + "%"}
         OR description ILIKE ${"%" + search + "%"}
    `;
    total = count;
  } else {
    entries = await sql`
      SELECT id, slug, title, source_url, description, is_verified,
             download_count, tags, created_at, updated_at
      FROM library_entries
      ORDER BY download_count DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ count }] = await sql`
      SELECT count(*)::int FROM library_entries
    `;
    total = count;
  }

  return c.json({ entries, total, limit, offset });
});

// GET /library/:slug — Get a specific library entry
libraryRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const [entry] = await sql`
    SELECT * FROM library_entries WHERE slug = ${slug}
  `;

  if (!entry) {
    return c.json({ error: "Library entry not found" }, 404);
  }

  // Increment download count
  await sql`
    UPDATE library_entries
    SET download_count = download_count + 1
    WHERE slug = ${slug}
  `;

  return c.json(entry);
});

// GET /library/:slug/design.md — Download design.md for library entry
libraryRoutes.get("/:slug/design.md", async (c) => {
  const slug = c.req.param("slug");

  const [entry] = await sql`
    SELECT design_md, title FROM library_entries WHERE slug = ${slug}
  `;

  if (!entry) {
    return c.json({ error: "Library entry not found" }, 404);
  }

  // Increment download count
  await sql`
    UPDATE library_entries
    SET download_count = download_count + 1
    WHERE slug = ${slug}
  `;

  c.header("Content-Type", "text/markdown; charset=utf-8");
  c.header(
    "Content-Disposition",
    `attachment; filename="${slug}-design.md"`
  );

  return c.body(entry.design_md);
});
