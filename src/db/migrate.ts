import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { databaseUrl } from "./database-url.js";

const sql = postgres(databaseUrl(), { max: 1, prepare: false });
const migrationsDir = path.join(process.cwd(), "drizzle");

function scopeToConnectionSchema(statement: string) {
  return statement
    .replace(/"public"\./g, "")
    .replace(/\bpublic\./g, "");
}

try {
  const [target] = await sql<{ schemaName: string | null; searchPath: string }[]>`
    SELECT current_schema() AS "schemaName", current_setting('search_path') AS "searchPath"
  `;
  if (!target?.schemaName) throw new Error("No target schema resolved from the database connection.");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS __bar_par_migrations (
      filename text PRIMARY KEY,
      hash text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedRows = await sql<{ filename: string; hash: string }[]>`
    SELECT filename, hash
    FROM __bar_par_migrations
    ORDER BY filename
  `;
  const applied = new Map(appliedRows.map((row) => [row.filename, row.hash]));

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  for (const filename of files) {
    const content = await readFile(path.join(migrationsDir, filename), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    const previousHash = applied.get(filename);

    if (previousHash) {
      if (previousHash !== hash) {
        throw new Error(`Applied migration changed on disk: ${filename}`);
      }
      continue;
    }

    const statements = content
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map(scopeToConnectionSchema);

    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }
      await tx`
        INSERT INTO __bar_par_migrations (filename, hash)
        VALUES (${filename}, ${hash})
      `;
    });

    console.log(`Applied migration: ${filename}`);
  }

  console.log(JSON.stringify({
    ok: true,
    targetSchema: target.schemaName,
    searchPath: target.searchPath,
    migrationsKnown: files.length,
  }));
} finally {
  await sql.end();
}
