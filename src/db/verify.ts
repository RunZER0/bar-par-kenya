import { and, count, eq } from "drizzle-orm";
import postgres from "postgres";
import { ATP_UNITS, STARTER_FLASHCARDS } from "./atp-catalog.js";
import { createDatabase } from "./client.js";
import { databaseUrl } from "./database-url.js";
import { flashcards, mindMapNodes, subjects, topics } from "./schema.js";

const url = databaseUrl();
const database = createDatabase(url, 1);
const metadata = postgres(url, { max: 1, prepare: false });

try {
  const subjectRows = await database.db.select({
    id: subjects.id,
    slug: subjects.slug,
    unitCode: subjects.unitCode,
    name: subjects.name,
  }).from(subjects)
    .where(eq(subjects.published, true));

  const expectedCodes = new Set(ATP_UNITS.map((unit) => unit.unitCode));
  const actualCodes = new Set(subjectRows.map((row) => row.unitCode).filter(Boolean));

  if (subjectRows.length !== ATP_UNITS.length) {
    throw new Error(`Expected ${ATP_UNITS.length} published ATP units, found ${subjectRows.length}`);
  }
  for (const code of expectedCodes) {
    if (!actualCodes.has(code)) throw new Error(`Missing ATP unit ${code}`);
  }

  const cardRows = await database.db.select({
    subjectId: subjects.id,
    value: count(flashcards.id),
  }).from(subjects)
    .leftJoin(topics, and(eq(topics.subjectId, subjects.id), eq(topics.published, true)))
    .leftJoin(flashcards, and(eq(flashcards.topicId, topics.id), eq(flashcards.published, true)))
    .where(eq(subjects.published, true))
    .groupBy(subjects.id);

  const cardsBySubject = new Map(cardRows.map((row) => [row.subjectId, Number(row.value)]));
  for (const subject of subjectRows) {
    const total = cardsBySubject.get(subject.id) ?? 0;
    if (total < 1) throw new Error(`${subject.unitCode} has no published flashcards`);
  }

  const [cardTotalRow] = await database.db.select({ value: count() }).from(flashcards)
    .where(eq(flashcards.published, true));
  const cardTotal = Number(cardTotalRow?.value ?? 0);
  if (cardTotal < STARTER_FLASHCARDS.length) {
    throw new Error(`Expected at least ${STARTER_FLASHCARDS.length} published flashcards, found ${cardTotal}`);
  }

  const rootRows = await database.db.select({
    subjectId: mindMapNodes.subjectId,
    value: count(mindMapNodes.id),
  }).from(mindMapNodes)
    .where(and(eq(mindMapNodes.published, true), eq(mindMapNodes.kind, "unit")))
    .groupBy(mindMapNodes.subjectId);

  if (rootRows.length !== ATP_UNITS.length || rootRows.some((row) => Number(row.value) !== 1)) {
    throw new Error("Each ATP unit must have exactly one published mind-map root");
  }

  const [nodeTotalRow] = await database.db.select({ value: count() }).from(mindMapNodes)
    .where(eq(mindMapNodes.published, true));
  const nodeTotal = Number(nodeTotalRow?.value ?? 0);
  if (nodeTotal <= ATP_UNITS.length) {
    throw new Error("Mind maps contain no topic/issue nodes");
  }

  const [target] = await metadata<{ schemaName: string | null; searchPath: string }[]>`
    SELECT current_schema() AS "schemaName", current_setting('search_path') AS "searchPath"
  `;

  console.log(JSON.stringify({
    ok: true,
    targetSchema: target?.schemaName ?? null,
    searchPath: target?.searchPath ?? null,
    publishedUnits: subjectRows.length,
    publishedFlashcards: cardTotal,
    publishedMindMapNodes: nodeTotal,
    units: subjectRows
      .sort((a, b) => String(a.unitCode).localeCompare(String(b.unitCode)))
      .map((subject) => ({
        unitCode: subject.unitCode,
        name: subject.name,
        flashcards: cardsBySubject.get(subject.id) ?? 0,
      })),
  }, null, 2));
} finally {
  await database.close();
  await metadata.end();
}
