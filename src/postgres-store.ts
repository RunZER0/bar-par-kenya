import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type {
  Learner,
  FlashcardRating,
  FlashcardReview,
  NotificationPreferences,
  PracticeSession,
  ProgressSummary,
  Question,
  Subject,
  Topic,
  UserCredential,
} from "./domain.js";
import type { Database } from "./db/client.js";
import {
  attempts,
  bookmarks,
  flashcardReviews,
  learners,
  notificationPreferences,
  practiceSessions,
  pushTokens,
  questions,
  subjects,
  topics,
} from "./db/schema.js";
import type { CreateSessionInput, Store } from "./store.js";
import { ConflictError, NotFoundError, ValidationError } from "./store.js";

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function toLearner(row: typeof learners.$inferSelect): Learner {
  return {
    id: row.id,
    kind: row.kind,
    displayName: row.displayName,
    email: row.email,
    examDate: iso(row.examDate),
    createdAt: row.createdAt.toISOString(),
  };
}

function toQuestion(row: typeof questions.$inferSelect): Question {
  return {
    id: row.id,
    topicId: row.topicId,
    prompt: row.prompt,
    options: row.options,
    correctOptionId: row.correctOptionId,
    explanation: row.explanation,
    difficulty: row.difficulty,
  };
}

function toSession(row: typeof practiceSessions.$inferSelect): PracticeSession {
  return {
    id: row.id,
    learnerId: row.learnerId,
    mode: row.mode,
    status: row.status,
    questionIds: row.questionIds,
    currentIndex: row.currentIndex,
    correctCount: row.correctCount,
    startedAt: row.startedAt.toISOString(),
    completedAt: iso(row.completedAt),
  };
}

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  studyReminders: true,
  streakReminders: true,
  preferredHour: 19,
  timezone: "Africa/Nairobi",
};

export class PostgresStore implements Store {
  constructor(private readonly db: Database) {}

  async createGuest(deviceId?: string): Promise<Learner> {
    if (deviceId) {
      const [existing] = await this.db.select().from(learners).where(eq(learners.deviceId, deviceId)).limit(1);
      if (existing) return toLearner(existing);
    }
    const [created] = await this.db.insert(learners).values({
      kind: "guest",
      ...(deviceId ? { deviceId } : {}),
    }).returning();
    if (!created) throw new Error("Failed to create learner");
    return toLearner(created);
  }

  async getLearner(id: string): Promise<Learner | null> {
    const [row] = await this.db.select().from(learners).where(eq(learners.id, id)).limit(1);
    return row ? toLearner(row) : null;
  }

  async findUserByEmail(email: string): Promise<UserCredential | null> {
    const [row] = await this.db.select().from(learners)
      .where(and(eq(learners.email, email.toLowerCase()), isNotNull(learners.passwordHash)))
      .limit(1);
    return row?.passwordHash ? { learner: toLearner(row), passwordHash: row.passwordHash } : null;
  }

  async registerLearner(input: {
    learnerId?: string;
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<Learner> {
    const normalizedEmail = input.email.toLowerCase();
    const existing = await this.findUserByEmail(normalizedEmail);
    if (existing) throw new ConflictError("An account with this email already exists");

    if (input.learnerId) {
      const [updated] = await this.db.update(learners).set({
        kind: "registered",
        email: normalizedEmail,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        updatedAt: new Date(),
      }).where(and(eq(learners.id, input.learnerId), eq(learners.kind, "guest"))).returning();
      if (!updated) throw new ConflictError("This learner account cannot be upgraded");
      return toLearner(updated);
    }

    const [created] = await this.db.insert(learners).values({
      kind: "registered",
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
    }).returning();
    if (!created) throw new Error("Failed to register learner");
    return toLearner(created);
  }

  async listSubjects(): Promise<Subject[]> {
    const rows = await this.db.select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      description: subjects.description,
      position: subjects.position,
      topicCount: count(topics.id),
    }).from(subjects)
      .leftJoin(topics, and(eq(topics.subjectId, subjects.id), eq(topics.published, true)))
      .where(eq(subjects.published, true))
      .groupBy(subjects.id)
      .orderBy(asc(subjects.position));
    return rows.map((row) => ({ ...row, topicCount: Number(row.topicCount) }));
  }

  async listTopics(subjectSlug: string): Promise<Topic[] | null> {
    const [subject] = await this.db.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.slug, subjectSlug), eq(subjects.published, true))).limit(1);
    if (!subject) return null;
    const rows = await this.db.select({
      id: topics.id,
      subjectId: topics.subjectId,
      slug: topics.slug,
      name: topics.name,
      description: topics.description,
      position: topics.position,
      questionCount: count(questions.id),
    }).from(topics)
      .leftJoin(questions, and(eq(questions.topicId, topics.id), eq(questions.published, true)))
      .where(and(eq(topics.subjectId, subject.id), eq(topics.published, true)))
      .groupBy(topics.id)
      .orderBy(asc(topics.position));
    return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
  }

  async listFlashcards(input: { subjectId?: string | undefined; topicId?: string | undefined }): Promise<Question[]> {
    const filters = [eq(questions.published, true)];
    if (input.topicId) filters.push(eq(questions.topicId, input.topicId));
    if (input.subjectId) {
      const topicRows = await this.db.select({ id: topics.id }).from(topics)
        .where(and(eq(topics.subjectId, input.subjectId), eq(topics.published, true)));
      if (topicRows.length === 0) return [];
      filters.push(inArray(questions.topicId, topicRows.map((row) => row.id)));
    }
    const rows = await this.db.select().from(questions)
      .where(and(...filters)).orderBy(asc(questions.createdAt));
    return rows.map(toQuestion);
  }

  async getFlashcardReviews(learnerId: string): Promise<FlashcardReview[]> {
    const rows = await this.db.select().from(flashcardReviews)
      .where(eq(flashcardReviews.learnerId, learnerId));
    return rows.map((row) => ({
      questionId: row.questionId,
      rating: row.rating,
      reviewCount: row.reviewCount,
      dueAt: row.dueAt.toISOString(),
      lastReviewedAt: row.lastReviewedAt.toISOString(),
    }));
  }

  async reviewFlashcard(input: { learnerId: string; questionId: string; rating: FlashcardRating }): Promise<FlashcardReview> {
    const question = await this.getQuestion(input.questionId);
    if (!question) throw new NotFoundError("Flashcard not found");
    const now = new Date();
    const dueAt = new Date(now.getTime() + (input.rating === "known" ? 3 * 24 * 60 * 60 * 1000 : 10 * 60 * 1000));
    const [row] = await this.db.insert(flashcardReviews).values({
      learnerId: input.learnerId,
      questionId: input.questionId,
      rating: input.rating,
      dueAt,
      lastReviewedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [flashcardReviews.learnerId, flashcardReviews.questionId],
      set: {
        rating: input.rating,
        reviewCount: sql`${flashcardReviews.reviewCount} + 1`,
        dueAt,
        lastReviewedAt: now,
        updatedAt: now,
      },
    }).returning();
    if (!row) throw new Error("Failed to save flashcard review");
    return {
      questionId: row.questionId,
      rating: row.rating,
      reviewCount: row.reviewCount,
      dueAt: row.dueAt.toISOString(),
      lastReviewedAt: row.lastReviewedAt.toISOString(),
    };
  }

  async createPracticeSession(input: CreateSessionInput): Promise<PracticeSession> {
    const filters = [eq(questions.published, true)];
    if (input.topicId) filters.push(eq(questions.topicId, input.topicId));
    if (input.subjectId) {
      const topicRows = await this.db.select({ id: topics.id }).from(topics)
        .where(and(eq(topics.subjectId, input.subjectId), eq(topics.published, true)));
      if (topicRows.length === 0) throw new NotFoundError("No published topics found for this subject");
      filters.push(inArray(questions.topicId, topicRows.map((row) => row.id)));
    }
    const selected = await this.db.select({ id: questions.id }).from(questions)
      .where(and(...filters)).orderBy(sql`random()`).limit(input.questionCount);
    if (selected.length === 0) throw new NotFoundError("No questions are available for this selection");
    const [created] = await this.db.insert(practiceSessions).values({
      learnerId: input.learnerId,
      mode: input.mode,
      questionIds: selected.map((row) => row.id),
    }).returning();
    if (!created) throw new Error("Failed to create practice session");
    return toSession(created);
  }

  async getPracticeSession(id: string, learnerId: string): Promise<PracticeSession | null> {
    const [row] = await this.db.select().from(practiceSessions)
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.learnerId, learnerId))).limit(1);
    return row ? toSession(row) : null;
  }

  async getQuestion(id: string): Promise<Question | null> {
    const [row] = await this.db.select().from(questions)
      .where(and(eq(questions.id, id), eq(questions.published, true))).limit(1);
    return row ? toQuestion(row) : null;
  }

  async answerQuestion(input: {
    sessionId: string;
    learnerId: string;
    questionId: string;
    selectedOptionId: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [sessionRow] = await tx.select().from(practiceSessions)
        .where(and(
          eq(practiceSessions.id, input.sessionId),
          eq(practiceSessions.learnerId, input.learnerId),
        )).for("update").limit(1);
      if (!sessionRow) throw new NotFoundError("Practice session not found");
      if (sessionRow.status !== "active") throw new ConflictError("Practice session is already complete");
      const expectedQuestionId = sessionRow.questionIds[sessionRow.currentIndex];
      if (expectedQuestionId !== input.questionId) {
        throw new ConflictError("Answer the current question before continuing");
      }
      const [questionRow] = await tx.select().from(questions).where(eq(questions.id, input.questionId)).limit(1);
      if (!questionRow) throw new NotFoundError("Question not found");
      if (!questionRow.options.some((option) => option.id === input.selectedOptionId)) {
        throw new ValidationError("selectedOptionId is not an option for this question");
      }
      const isCorrect = questionRow.correctOptionId === input.selectedOptionId;
      await tx.insert(attempts).values({
        sessionId: sessionRow.id,
        learnerId: input.learnerId,
        questionId: input.questionId,
        selectedOptionId: input.selectedOptionId,
        isCorrect,
      });
      const nextIndex = sessionRow.currentIndex + 1;
      const completed = nextIndex >= sessionRow.questionIds.length;
      const [updated] = await tx.update(practiceSessions).set({
        currentIndex: nextIndex,
        correctCount: sessionRow.correctCount + (isCorrect ? 1 : 0),
        status: completed ? "completed" : "active",
        completedAt: completed ? new Date() : null,
      }).where(eq(practiceSessions.id, sessionRow.id)).returning();
      if (!updated) throw new Error("Failed to update practice session");
      const nextId = updated.questionIds[updated.currentIndex];
      const [nextRow] = nextId
        ? await tx.select().from(questions).where(eq(questions.id, nextId)).limit(1)
        : [];
      return {
        isCorrect,
        correctOptionId: questionRow.correctOptionId,
        explanation: questionRow.explanation,
        session: toSession(updated),
        nextQuestion: nextRow ? toQuestion(nextRow) : null,
      };
    });
  }

  async getProgress(learnerId: string): Promise<ProgressSummary> {
    const attemptRows = await this.db.select({
      isCorrect: attempts.isCorrect,
      answeredAt: attempts.answeredAt,
    }).from(attempts).where(eq(attempts.learnerId, learnerId)).orderBy(desc(attempts.answeredAt));
    const completedRows = await this.db.select({ value: count() }).from(practiceSessions)
      .where(and(eq(practiceSessions.learnerId, learnerId), eq(practiceSessions.status, "completed")));
    const completedSessions = completedRows[0]?.value ?? 0;
    const answeredDays = new Set(attemptRows.map((row) => row.answeredAt.toISOString().slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    while (answeredDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    const correct = attemptRows.filter((row) => row.isCorrect).length;
    return {
      answered: attemptRows.length,
      correct,
      accuracy: attemptRows.length ? Math.round((correct / attemptRows.length) * 100) : 0,
      completedSessions: Number(completedSessions),
      currentStreakDays: streak,
    };
  }

  async listBookmarks(learnerId: string): Promise<Question[]> {
    const rows = await this.db.select({ question: questions }).from(bookmarks)
      .innerJoin(questions, eq(questions.id, bookmarks.questionId))
      .where(eq(bookmarks.learnerId, learnerId)).orderBy(desc(bookmarks.createdAt));
    return rows.map((row) => toQuestion(row.question));
  }

  async addBookmark(learnerId: string, questionId: string): Promise<void> {
    const question = await this.getQuestion(questionId);
    if (!question) throw new NotFoundError("Question not found");
    await this.db.insert(bookmarks).values({ learnerId, questionId }).onConflictDoNothing();
  }

  async removeBookmark(learnerId: string, questionId: string): Promise<void> {
    await this.db.delete(bookmarks).where(and(eq(bookmarks.learnerId, learnerId), eq(bookmarks.questionId, questionId)));
  }

  async getNotificationPreferences(learnerId: string): Promise<NotificationPreferences> {
    const [row] = await this.db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.learnerId, learnerId)).limit(1);
    return row ? {
      enabled: row.enabled,
      studyReminders: row.studyReminders,
      streakReminders: row.streakReminders,
      preferredHour: row.preferredHour,
      timezone: row.timezone,
    } : defaultPreferences;
  }

  async updateNotificationPreferences(learnerId: string, input: Partial<NotificationPreferences>) {
    const current = await this.getNotificationPreferences(learnerId);
    const next = { ...current, ...input };
    const [row] = await this.db.insert(notificationPreferences).values({ learnerId, ...next })
      .onConflictDoUpdate({
        target: notificationPreferences.learnerId,
        set: { ...next, updatedAt: new Date() },
      }).returning();
    if (!row) throw new Error("Failed to update notification preferences");
    return {
      enabled: row.enabled,
      studyReminders: row.studyReminders,
      streakReminders: row.streakReminders,
      preferredHour: row.preferredHour,
      timezone: row.timezone,
    };
  }

  async savePushToken(learnerId: string, token: string, platform: "android" | "ios" | "web"): Promise<void> {
    await this.db.insert(pushTokens).values({ learnerId, token, platform }).onConflictDoUpdate({
      target: pushTokens.token,
      set: { learnerId, platform, active: true, updatedAt: new Date() },
    });
  }
}
