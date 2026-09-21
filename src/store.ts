import type {
  AttemptResult,
  FlashcardRating,
  FlashcardReview,
  Learner,
  NotificationPreferences,
  PracticeMode,
  PracticeSession,
  ProgressSummary,
  Question,
  Subject,
  Topic,
  UserCredential,
} from "./domain.js";

export interface CreateSessionInput {
  learnerId: string;
  subjectId?: string;
  topicId?: string;
  questionCount: number;
  mode: PracticeMode;
}

export interface Store {
  createGuest(deviceId?: string): Promise<Learner>;
  getLearner(id: string): Promise<Learner | null>;
  findUserByEmail(email: string): Promise<UserCredential | null>;
  registerLearner(input: {
    learnerId?: string;
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<Learner>;
  listSubjects(): Promise<Subject[]>;
  listTopics(subjectSlug: string): Promise<Topic[] | null>;
  listFlashcards(input: { subjectId?: string | undefined; topicId?: string | undefined }): Promise<Question[]>;
  getFlashcardReviews(learnerId: string): Promise<FlashcardReview[]>;
  reviewFlashcard(input: { learnerId: string; questionId: string; rating: FlashcardRating }): Promise<FlashcardReview>;
  createPracticeSession(input: CreateSessionInput): Promise<PracticeSession>;
  getPracticeSession(id: string, learnerId: string): Promise<PracticeSession | null>;
  getQuestion(id: string): Promise<Question | null>;
  answerQuestion(input: {
    sessionId: string;
    learnerId: string;
    questionId: string;
    selectedOptionId: string;
  }): Promise<AttemptResult>;
  getProgress(learnerId: string): Promise<ProgressSummary>;
  listBookmarks(learnerId: string): Promise<Question[]>;
  addBookmark(learnerId: string, questionId: string): Promise<void>;
  removeBookmark(learnerId: string, questionId: string): Promise<void>;
  getNotificationPreferences(learnerId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(
    learnerId: string,
    input: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences>;
  savePushToken(learnerId: string, token: string, platform: "android" | "ios" | "web"): Promise<void>;
}

export class ConflictError extends Error {}
export class NotFoundError extends Error {}
export class ValidationError extends Error {}
