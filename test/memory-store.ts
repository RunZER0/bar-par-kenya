import { randomUUID } from "node:crypto";
import type {
  AttemptResult,
  FlashcardRating,
  FlashcardReview,
  Learner,
  NotificationPreferences,
  PracticeSession,
  ProgressSummary,
  Question,
  Subject,
  Topic,
  UserCredential,
} from "../src/domain.js";
import type { CreateSessionInput, Store } from "../src/store.js";
import { ConflictError, NotFoundError, ValidationError } from "../src/store.js";

const subjectId = "10000000-0000-4000-8000-000000000001";
const topicId = "20000000-0000-4000-8000-000000000001";

const questionFixtures: Question[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    topicId,
    prompt: "When approaching a Civil Litigation problem, what should you identify first?",
    options: [{ id: "a", text: "The procedural issue and relief sought" }, { id: "b", text: "The document formatting" }],
    correctOptionId: "a",
    explanation: "Start by identifying the procedural issue and the relief being sought; that frames the rest of the analysis.",
    difficulty: "foundation",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    topicId,
    prompt: "Before drafting an interlocutory application, what should you confirm?",
    options: [{ id: "a", text: "The legal basis, material facts, and orders sought" }, { id: "b", text: "Only the page count" }],
    correctOptionId: "a",
    explanation: "Confirming the legal basis, material facts, and orders sought keeps the application focused and reviewable.",
    difficulty: "foundation",
  },
];

const preferences: NotificationPreferences = {
  enabled: false,
  studyReminders: true,
  streakReminders: true,
  preferredHour: 19,
  timezone: "Africa/Nairobi",
};

export class MemoryStore implements Store {
  learners = new Map<string, Learner>();
  credentials = new Map<string, string>();
  sessions = new Map<string, PracticeSession>();
  answerHistory = new Map<string, boolean[]>();
  bookmarks = new Map<string, Set<string>>();
  notificationPreferences = new Map<string, NotificationPreferences>();
  pushTokens = new Map<string, { learnerId: string; platform: "android" | "ios" | "web" }>();
  flashcardReviews = new Map<string, FlashcardReview>();

  async createGuest(): Promise<Learner> {
    const learner: Learner = {
      id: randomUUID(),
      kind: "guest",
      displayName: null,
      email: null,
      examDate: null,
      createdAt: new Date().toISOString(),
    };
    this.learners.set(learner.id, learner);
    return learner;
  }

  async getLearner(id: string) { return this.learners.get(id) ?? null; }

  async findUserByEmail(email: string): Promise<UserCredential | null> {
    const learner = [...this.learners.values()].find((value) => value.email === email) ?? null;
    const passwordHash = learner ? this.credentials.get(learner.id) : undefined;
    return learner && passwordHash ? { learner, passwordHash } : null;
  }

  async registerLearner(input: { learnerId?: string; email: string; passwordHash: string; displayName: string }) {
    if (await this.findUserByEmail(input.email)) throw new ConflictError("An account with this email already exists");
    const existing = input.learnerId ? this.learners.get(input.learnerId) : undefined;
    if (input.learnerId && (!existing || existing.kind !== "guest")) {
      throw new ConflictError("This learner account cannot be upgraded");
    }
    const learner: Learner = {
      id: existing?.id ?? randomUUID(),
      kind: "registered",
      displayName: input.displayName,
      email: input.email,
      examDate: existing?.examDate ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.learners.set(learner.id, learner);
    this.credentials.set(learner.id, input.passwordHash);
    return learner;
  }

  async listSubjects(): Promise<Subject[]> {
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
    return courses.map(([slug, name, description], index) => ({
      id: index === 0 ? subjectId : `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      slug,
      name,
      description,
      position: index + 1,
      topicCount: index === 0 ? 1 : 0,
    }));
  }

  async listTopics(subjectSlug: string): Promise<Topic[] | null> {
    if (subjectSlug !== "civil-litigation") return null;
    return [{
      id: topicId,
      subjectId,
      slug: "effective-revision",
      name: "Effective Revision",
      description: "Demo topic",
      position: 1,
      questionCount: questionFixtures.length,
    }];
  }

  async listFlashcards(input: { subjectId?: string | undefined; topicId?: string | undefined }) {
    return questionFixtures.filter((question) =>
      (!input.topicId || question.topicId === input.topicId)
      && (!input.subjectId || input.subjectId === subjectId),
    );
  }

  async getFlashcardReviews(learnerId: string) {
    return [...this.flashcardReviews.values()].filter((review) => review.questionId.startsWith(`${learnerId}:`)).map((review) => ({
      ...review,
      questionId: review.questionId.slice(learnerId.length + 1),
    }));
  }

  async reviewFlashcard(input: { learnerId: string; questionId: string; rating: FlashcardRating }): Promise<FlashcardReview> {
    if (!await this.getQuestion(input.questionId)) throw new NotFoundError("Flashcard not found");
    const key = `${input.learnerId}:${input.questionId}`;
    const previous = this.flashcardReviews.get(key);
    const now = new Date();
    const review: FlashcardReview = {
      questionId: input.questionId,
      rating: input.rating,
      reviewCount: (previous?.reviewCount ?? 0) + 1,
      dueAt: new Date(now.getTime() + (input.rating === "known" ? 3 * 24 * 60 * 60 * 1000 : 10 * 60 * 1000)).toISOString(),
      lastReviewedAt: now.toISOString(),
    };
    this.flashcardReviews.set(key, { ...review, questionId: key });
    return review;
  }

  async createPracticeSession(input: CreateSessionInput) {
    const selected = questionFixtures
      .filter((question) => !input.topicId || question.topicId === input.topicId)
      .slice(0, input.questionCount);
    if (!selected.length) throw new NotFoundError("No questions are available for this selection");
    const session: PracticeSession = {
      id: randomUUID(),
      learnerId: input.learnerId,
      mode: input.mode,
      status: "active",
      questionIds: selected.map((question) => question.id),
      currentIndex: 0,
      correctCount: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getPracticeSession(id: string, learnerId: string) {
    const session = this.sessions.get(id);
    return session?.learnerId === learnerId ? session : null;
  }

  async getQuestion(id: string) { return questionFixtures.find((question) => question.id === id) ?? null; }

  async answerQuestion(input: { sessionId: string; learnerId: string; questionId: string; selectedOptionId: string }): Promise<AttemptResult> {
    const session = await this.getPracticeSession(input.sessionId, input.learnerId);
    if (!session) throw new NotFoundError("Practice session not found");
    if (session.status === "completed") throw new ConflictError("Practice session is already complete");
    if (session.questionIds[session.currentIndex] !== input.questionId) {
      throw new ConflictError("Answer the current question before continuing");
    }
    const question = await this.getQuestion(input.questionId);
    if (!question) throw new NotFoundError("Question not found");
    if (!question.options.some((option) => option.id === input.selectedOptionId)) {
      throw new ValidationError("selectedOptionId is not an option for this question");
    }
    const isCorrect = question.correctOptionId === input.selectedOptionId;
    const currentIndex = session.currentIndex + 1;
    const completed = currentIndex >= session.questionIds.length;
    const updated: PracticeSession = {
      ...session,
      currentIndex,
      correctCount: session.correctCount + (isCorrect ? 1 : 0),
      status: completed ? "completed" : "active",
      completedAt: completed ? new Date().toISOString() : null,
    };
    this.sessions.set(updated.id, updated);
    this.answerHistory.set(input.learnerId, [...(this.answerHistory.get(input.learnerId) ?? []), isCorrect]);
    const nextId = updated.questionIds[updated.currentIndex];
    return {
      isCorrect,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      session: updated,
      nextQuestion: nextId ? await this.getQuestion(nextId) : null,
    };
  }

  async getProgress(learnerId: string): Promise<ProgressSummary> {
    const history = this.answerHistory.get(learnerId) ?? [];
    const correct = history.filter(Boolean).length;
    return {
      answered: history.length,
      correct,
      accuracy: history.length ? Math.round(correct / history.length * 100) : 0,
      completedSessions: [...this.sessions.values()].filter((session) => session.learnerId === learnerId && session.status === "completed").length,
      currentStreakDays: history.length ? 1 : 0,
    };
  }

  async listBookmarks(learnerId: string) {
    const ids = this.bookmarks.get(learnerId) ?? new Set<string>();
    return questionFixtures.filter((question) => ids.has(question.id));
  }

  async addBookmark(learnerId: string, questionId: string) {
    if (!await this.getQuestion(questionId)) throw new NotFoundError("Question not found");
    const ids = this.bookmarks.get(learnerId) ?? new Set<string>();
    ids.add(questionId);
    this.bookmarks.set(learnerId, ids);
  }

  async removeBookmark(learnerId: string, questionId: string) {
    this.bookmarks.get(learnerId)?.delete(questionId);
  }

  async getNotificationPreferences(learnerId: string) {
    return this.notificationPreferences.get(learnerId) ?? preferences;
  }

  async updateNotificationPreferences(learnerId: string, input: Partial<NotificationPreferences>) {
    const next = { ...await this.getNotificationPreferences(learnerId), ...input };
    this.notificationPreferences.set(learnerId, next);
    return next;
  }

  async savePushToken(learnerId: string, token: string, platform: "android" | "ios" | "web") {
    this.pushTokens.set(token, { learnerId, platform });
  }
}

export const fixtureIds = { subjectId, topicId, firstQuestionId: questionFixtures[0]!.id };
