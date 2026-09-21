import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../src/db/client.js";
import * as schema from "../src/db/schema.js";
import { questions, subjects, topics } from "../src/db/schema.js";
import { PostgresStore } from "../src/postgres-store.js";

describe("PostgresStore", () => {
  let client: PGlite;
  let store: PostgresStore;
  let subjectId: string;
  let topicId: string;
  let questionId: string;

  beforeEach(async () => {
    client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    store = new PostgresStore(db as unknown as Database);

    const [subject] = await db.insert(subjects).values({
      slug: "civil-litigation-demo",
      name: "Civil Litigation Demo",
      description: "Test fixture",
      position: 1,
      published: true,
    }).returning();
    if (!subject) throw new Error("Subject fixture failed");
    subjectId = subject.id;

    const [topic] = await db.insert(topics).values({
      subjectId,
      slug: "procedure-demo",
      name: "Procedure Demo",
      description: "Test fixture",
      position: 1,
      published: true,
    }).returning();
    if (!topic) throw new Error("Topic fixture failed");
    topicId = topic.id;

    const [question] = await db.insert(questions).values({
      topicId,
      prompt: "A persistence-path test question",
      options: [{ id: "a", text: "Correct" }, { id: "b", text: "Incorrect" }],
      correctOptionId: "a",
      explanation: "The storage layer returned and scored this fixture.",
      difficulty: "foundation",
      published: true,
    }).returning();
    if (!question) throw new Error("Question fixture failed");
    questionId = question.id;
  }, 120_000);

  afterEach(async () => {
    await client.close();
  });

  it("migrates the schema and persists a complete learning flow", async () => {
    const learner = await store.createGuest("database-test-device");
    expect((await store.listSubjects())[0]).toMatchObject({ id: subjectId, topicCount: 1 });
    expect((await store.listTopics("civil-litigation-demo"))?.[0]).toMatchObject({
      id: topicId,
      questionCount: 1,
    });

    const session = await store.createPracticeSession({
      learnerId: learner.id,
      topicId,
      mode: "practice",
      questionCount: 10,
    });
    expect(session.questionIds).toEqual([questionId]);

    const answer = await store.answerQuestion({
      learnerId: learner.id,
      sessionId: session.id,
      questionId,
      selectedOptionId: "a",
    });
    expect(answer).toMatchObject({ isCorrect: true, session: { status: "completed", correctCount: 1 } });
    expect(await store.getProgress(learner.id)).toMatchObject({
      answered: 1,
      correct: 1,
      accuracy: 100,
      completedSessions: 1,
    });

    await store.addBookmark(learner.id, questionId);
    expect(await store.listBookmarks(learner.id)).toHaveLength(1);

    const notificationSettings = await store.updateNotificationPreferences(learner.id, {
      enabled: true,
      preferredHour: 20,
    });
    expect(notificationSettings).toMatchObject({ enabled: true, preferredHour: 20 });

    await store.savePushToken(learner.id, "ExponentPushToken[database-test-token]", "android");

    expect(await store.getFlashcardReviews(learner.id)).toEqual([]);
    const review = await store.reviewFlashcard({ learnerId: learner.id, questionId, rating: "again" });
    expect(review).toMatchObject({ questionId, rating: "again", reviewCount: 1 });
    expect(new Date(review.dueAt).getTime()).toBeGreaterThan(Date.now());
    expect(await store.getFlashcardReviews(learner.id)).toMatchObject([{ questionId, rating: "again", reviewCount: 1 }]);
  }, 120_000);
});
