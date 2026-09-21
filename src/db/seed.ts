import { eq } from "drizzle-orm";
import { loadConfig } from "../config.js";
import { createDatabase } from "./client.js";
import { questions, subjects, topics } from "./schema.js";

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL, 1);
const courses = [
  ["civil-litigation", "Civil Litigation", "Procedure, pleadings, interlocutory applications, and trial preparation."],
  ["criminal-litigation", "Criminal Litigation", "Criminal process, evidence, advocacy, and sentencing practice."],
  ["probate-administration", "Probate & Administration", "Succession practice, probate procedure, and estate administration."],
  ["legal-writing-drafting", "Legal Writing & Drafting", "Clear, precise drafting for opinions, pleadings, and professional work."],
  ["trial-advocacy", "Trial Advocacy", "Build the courtroom skills that turn preparation into performance."],
  ["professional-ethics", "Professional Ethics & Practice", "The professional standards and duties that guide advocates."],
  ["legal-practice-management", "Legal Practice Management", "Run a compliant, organised, and sustainable legal practice."],
  ["conveyancing", "Conveyancing", "The transaction, due diligence, and registration workflow."],
  ["commercial-transactions", "Commercial Transactions", "Practical principles for commercial agreements and transactions."],
] as const;

try {
  let [subject] = await database.db.select().from(subjects).where(eq(subjects.slug, courses[0]![0])).limit(1);
  if (!subject) {
    const [legacySubject] = await database.db.select().from(subjects).where(eq(subjects.slug, "study-skills-demo")).limit(1);
    if (legacySubject) {
      [subject] = await database.db.update(subjects).set({
        slug: courses[0]![0], name: courses[0]![1], description: courses[0]![2], published: true,
      }).where(eq(subjects.id, legacySubject.id)).returning();
    }
  }
  if (!subject) {
    [subject] = await database.db.insert(subjects).values({
      slug: courses[0]![0], name: courses[0]![1], description: courses[0]![2], position: 1, published: true,
    }).returning();
  }
  if (!subject) throw new Error("Failed to seed Civil Litigation course");

  for (const [index, [slug, name, description]] of courses.entries()) {
    if (index === 0) continue;
    await database.db.insert(subjects).values({ slug, name, description, position: index + 1, published: true }).onConflictDoUpdate({
      target: subjects.slug,
      set: { name, description, position: index + 1, published: true },
    });
  }

  const existingTopics = await database.db.select().from(topics).where(eq(topics.subjectId, subject.id));
  const topic = existingTopics[0] ?? (await database.db.insert(topics).values({
    subjectId: subject.id,
    slug: "civil-procedure-foundations",
    name: "Civil Procedure Foundations",
    description: "A starter set for building recall before substantive revision.",
    position: 1,
    published: true,
  }).returning())[0];
  if (!topic) throw new Error("Failed to seed topic");

  const existingQuestions = await database.db.select({ id: questions.id }).from(questions).where(eq(questions.topicId, topic.id));
  if (existingQuestions.length === 0) {
    await database.db.insert(questions).values([
      {
        topicId: topic.id,
        prompt: "When approaching a Civil Litigation problem, what should you identify first?",
        options: [{ id: "a", text: "The procedural issue and relief sought" }, { id: "b", text: "The document formatting" }, { id: "c", text: "The preferred colour scheme" }, { id: "d", text: "The length of the answer" }],
        correctOptionId: "a",
        explanation: "Start by identifying the procedural issue and the relief being sought; that frames the rest of the analysis.",
        difficulty: "foundation",
        published: true,
      },
      {
        topicId: topic.id,
        prompt: "Before drafting an interlocutory application, what should you confirm?",
        options: [{ id: "a", text: "The legal basis, material facts, and orders sought" }, { id: "b", text: "Only the page count" }, { id: "c", text: "The font used in the heading" }, { id: "d", text: "Whether the issue can be avoided" }],
        correctOptionId: "a",
        explanation: "Confirming the legal basis, material facts, and orders sought keeps the application focused and reviewable.",
        difficulty: "foundation",
        published: true,
      },
      {
        topicId: topic.id,
        prompt: "What is the clearest reason to structure a Civil Litigation answer around issues?",
        options: [{ id: "a", text: "It makes every question easier" }, { id: "b", text: "It removes the need for authority" }, { id: "c", text: "It connects facts, rules, analysis, and relief" }, { id: "d", text: "It guarantees a perfect score" }],
        correctOptionId: "c",
        explanation: "An issue-led structure helps connect the facts to the applicable rules, analysis, and relief sought.",
        difficulty: "standard",
        published: true,
      },
    ]);
  }
  console.log("ATP course library seeded. Review substantive Kenyan bar content before launch.");
} finally {
  await database.close();
}
