export type LearnerKind = "guest" | "registered";
export type PracticeMode = "practice" | "timed";
export type SessionStatus = "active" | "completed";
export type Difficulty = "foundation" | "standard" | "advanced";
export type FlashcardRating = "again" | "known";
export type CardRating = "again" | "hard" | "good" | "easy";
export type CardState = "new" | "learning" | "review";

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


export interface CardReviewState {
  flashcardId: string;
  rating: CardRating;
  state: CardState;
  reviewCount: number;
  lapses: number;
  intervalDays: number;
  easePermille: number;
  dueAt: string;
  lastReviewedAt: string;
}

export interface StudyCard {
  id: string;
  topicId: string;
  subjectId: string;
  unitCode: string;
  subjectName: string;
  topicName: string;
  front: string;
  back: string;
  source: string | null;
  review: CardReviewState | null;
}

export interface DeckSummary {
  subjectId: string;
  slug: string;
  unitCode: string;
  name: string;
  total: number;
  due: number;
  newCount: number;
  nextDueAt: string | null;
}

export interface CardSession {
  cards: StudyCard[];
  total: number;
  nextDueAt: string | null;
}

export interface MindMapNode {
  id: string;
  key: string;
  parentKey: string | null;
  label: string;
  kind: "unit" | "topic" | "issue";
  depth: number;
  position: number;
}

export interface MindMapSummary {
  subjectId: string;
  slug: string;
  unitCode: string;
  name: string;
  nodeCount: number;
}

export interface MindMapData {
  subjectId: string;
  slug: string;
  unitCode: string;
  name: string;
  nodes: MindMapNode[];
}
