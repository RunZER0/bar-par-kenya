import postgres from "postgres";
import { databaseUrl } from "./database-url.js";

const sql = postgres(databaseUrl(), { max: 1, prepare: false });

const barParTables = new Set([
  "__bar_par_migrations",
  "attempts",
  "bookmarks",
  "card_reviews",
  "flashcard_reviews",
  "flashcards",
  "learners",
  "mind_map_nodes",
  "notification_preferences",
  "practice_sessions",
  "push_tokens",
  "questions",
  "subjects",
  "topics",
]);

try {
  const [target] = await sql<{
    schemaName: string | null;
    searchPath: string;
    canUse: boolean;
    canCreate: boolean;
  }[]>`
    SELECT
      current_schema() AS "schemaName",
      current_setting('search_path') AS "searchPath",
      has_schema_privilege(current_user, current_schema(), 'USAGE') AS "canUse",
      has_schema_privilege(current_user, current_schema(), 'CREATE') AS "canCreate"
  `;

  if (!target?.schemaName) {
    throw new Error("The database connection does not resolve to a writable target schema.");
  }
  if (!target.canUse) {
    throw new Error(`Database role cannot use target schema ${target.schemaName}.`);
  }
  if (!target.canCreate) {
    throw new Error(`Database role cannot create Bar Par objects in target schema ${target.schemaName}.`);
  }

  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = ${target.schemaName}
  `;
  const unknown = rows
    .map((row) => row.tablename)
    .filter((name) => !barParTables.has(name));

  if (unknown.length > 0) {
    throw new Error(
      `Safety check stopped bootstrap: target schema ${target.schemaName} contains unrecognized table(s): ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? "…" : ""}.`,
    );
  }

  console.log(JSON.stringify({
    ok: true,
    targetSchema: target.schemaName,
    searchPath: target.searchPath,
    schemaUsable: true,
    schemaWritable: true,
    existingBarParTables: rows.length,
  }));
} finally {
  await sql.end();
}
