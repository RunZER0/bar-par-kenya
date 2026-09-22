import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const learnerKind = pgEnum("learner_kind", ["guest", "registered"]);
export const difficulty = pgEnum("difficulty", ["foundation", "standard", "advanced"]);
export const practiceMode = pgEnum("practice_mode", ["practice", "timed"]);
export const sessionStatus = pgEnum("session_status", ["active", "completed"]);
export const pushPlatform = pgEnum("push_platform", ["android", "ios", "web"]);
export const flashcardRating = pgEnum("flashcard_rating", ["again", "known"]);
export const cardRating = pgEnum("card_rating", ["again", "hard", "good", "easy"]);
export const cardState = pgEnum("card_state", ["new", "learning", "review"]);
export const mindMapNodeKind = pgEnum("mind_map_node_kind", ["unit", "topic", "issue"]);

export const learners = pgTable("learners", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: learnerKind("kind").notNull().default("guest"),
  deviceId: text("device_id"),
  displayName: text("display_name"),
  email: text("email"),
  passwordHash: text("password_hash"),
  examDate: timestamp("exam_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("learners_email_unique").on(table.email),
  uniqueIndex("learners_device_id_unique").on(table.deviceId),
]);

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull(),
  published: boolean("published").notNull().default(false),
  unitCode: text("unit_code").unique(),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull(),
  published: boolean("published").notNull().default(false),
}, (table) => [uniqueIndex("topics_subject_slug_unique").on(table.subjectId, table.slug)]);

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<Array<{ id: string; text: string }>>().notNull(),
  correctOptionId: text("correct_option_id").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: difficulty("difficulty").notNull().default("standard"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flashcardReviews = pgTable("flashcard_reviews", {
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  rating: flashcardRating("rating").notNull(),
  reviewCount: integer("review_count").notNull().default(1),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.learnerId, table.questionId] })]);

export const practiceSessions = pgTable("practice_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  mode: practiceMode("mode").notNull(),
  status: sessionStatus("status").notNull().default("active"),
  questionIds: jsonb("question_ids").$type<string[]>().notNull(),
  currentIndex: integer("current_index").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const attempts = pgTable("attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => practiceSessions.id, { onDelete: "cascade" }),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedOptionId: text("selected_option_id").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("attempts_session_question_unique").on(table.sessionId, table.questionId)]);

export const bookmarks = pgTable("bookmarks", {
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.learnerId, table.questionId] })]);

export const notificationPreferences = pgTable("notification_preferences", {
  learnerId: uuid("learner_id").primaryKey().references(() => learners.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  studyReminders: boolean("study_reminders").notNull().default(true),
  streakReminders: boolean("streak_reminders").notNull().default(true),
  preferredHour: integer("preferred_hour").notNull().default(19),
  timezone: text("timezone").notNull().default("Africa/Nairobi"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushTokens = pgTable("push_tokens", {
  token: text("token").primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  platform: pushPlatform("platform").notNull(),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


export const flashcards = pgTable("flashcards", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  source: text("source"),
  position: integer("position").notNull().default(0),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("flashcards_topic_position_unique").on(table.topicId, table.position)]);

export const cardReviews = pgTable("card_reviews", {
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  flashcardId: uuid("flashcard_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  rating: cardRating("rating").notNull(),
  state: cardState("state").notNull().default("new"),
  reviewCount: integer("review_count").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  intervalDays: integer("interval_days").notNull().default(0),
  easePermille: integer("ease_permille").notNull().default(2500),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.learnerId, table.flashcardId] })]);

export const mindMapNodes = pgTable("mind_map_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  parentKey: text("parent_key"),
  label: text("label").notNull(),
  kind: mindMapNodeKind("kind").notNull(),
  depth: integer("depth").notNull(),
  position: integer("position").notNull(),
  published: boolean("published").notNull().default(false),
}, (table) => [
  uniqueIndex("mind_map_nodes_subject_position_unique").on(table.subjectId, table.position),
]);
