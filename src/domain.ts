export type LearnerKind = "guest" | "registered";
export type PracticeMode = "practice" | "timed";
export type SessionStatus = "active" | "completed";
export type Difficulty = "foundation" | "standard" | "advanced";
export type FlashcardRating = "again" | "known";

export interface Learner {
  id: string;
  kind: LearnerKind;
  displayName: string | null;
  email: string | null;
  examDate: string | null;
  createdAt: string;
}

export interface UserCredential {
  learner: Learner;
  passwordHash: string;
}

export interface Subject {
  id: string;
  slug: string;
  name: string;
  description: string;
  position: number;
  topicCount: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  slug: string;
  name: string;
  description: string;
  position: number;
  questionCount: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  topicId: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: Difficulty;
}

export interface FlashcardReview {
  questionId: string;
  rating: FlashcardRating;
  reviewCount: number;
  dueAt: string;
  lastReviewedAt: string;
}

export interface PracticeSession {
  id: string;
  learnerId: string;
  mode: PracticeMode;
  status: SessionStatus;
  questionIds: string[];
  currentIndex: number;
  correctCount: number;
  startedAt: string;
  completedAt: string | null;
}

export interface AttemptResult {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
  session: PracticeSession;
  nextQuestion: Question | null;
}

export interface ProgressSummary {
  answered: number;
  correct: number;
  accuracy: number;
  completedSessions: number;
  currentStreakDays: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  studyReminders: boolean;
  streakReminders: boolean;
  preferredHour: number;
  timezone: string;
}
