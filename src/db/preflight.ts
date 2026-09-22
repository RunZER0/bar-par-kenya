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
  const [privileges] = await sql<{
    publicUsage: boolean;
    publicCreate: boolean;
  }[]>`
    SELECT
      has_schema_privilege(current_user, 'public', 'USAGE') AS "publicUsage",
      has_schema_privilege(current_user, 'public', 'CREATE') AS "publicCreate"
  `;

  if (!privileges?.publicUsage) {
    throw new Error("Database role cannot use the public schema.");
  }
  if (!privileges.publicCreate) {
    throw new Error("Database role cannot create Bar Par tables in the public schema.");
  }

  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;
  const unknownCount = rows.filter((row) => !barParTables.has(row.tablename)).length;

  if (unknownCount > 0) {
    throw new Error(
      `Safety check stopped bootstrap: the target database contains ${unknownCount} unrecognized public table(s). Use a dedicated Bar Par database.`,
    );
  }

  console.log(JSON.stringify({
    ok: true,
    publicSchemaUsable: true,
    publicSchemaWritable: true,
    existingBarParTables: rows.length,
  }));
} finally {
  await sql.end();
}
