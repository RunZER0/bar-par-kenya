CREATE TYPE "public"."card_rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."card_state" AS ENUM('new', 'learning', 'review');--> statement-breakpoint
CREATE TYPE "public"."mind_map_node_kind" AS ENUM('unit', 'topic', 'issue');--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "unit_code" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_unit_code_unique" UNIQUE("unit_code");--> statement-breakpoint
CREATE TABLE "flashcards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL,
  "front" text NOT NULL,
  "back" text NOT NULL,
  "source" text,
  "position" integer DEFAULT 0 NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "card_reviews" (
  "learner_id" uuid NOT NULL,
  "flashcard_id" uuid NOT NULL,
  "rating" "card_rating" NOT NULL,
  "state" "card_state" DEFAULT 'new' NOT NULL,
  "review_count" integer DEFAULT 0 NOT NULL,
  "lapses" integer DEFAULT 0 NOT NULL,
  "interval_days" integer DEFAULT 0 NOT NULL,
  "ease_permille" integer DEFAULT 2500 NOT NULL,
  "due_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "card_reviews_learner_id_flashcard_id_pk" PRIMARY KEY("learner_id","flashcard_id")
);--> statement-breakpoint
CREATE TABLE "mind_map_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject_id" uuid NOT NULL,
  "key" text NOT NULL,
  "parent_key" text,
  "label" text NOT NULL,
  "kind" "mind_map_node_kind" NOT NULL,
  "depth" integer NOT NULL,
  "position" integer NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  CONSTRAINT "mind_map_nodes_key_unique" UNIQUE("key")
);--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mind_map_nodes" ADD CONSTRAINT "mind_map_nodes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_topic_position_unique" ON "flashcards" USING btree ("topic_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "mind_map_nodes_subject_position_unique" ON "mind_map_nodes" USING btree ("subject_id","position");