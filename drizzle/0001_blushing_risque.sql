CREATE TYPE "public"."flashcard_rating" AS ENUM('again', 'known');--> statement-breakpoint
CREATE TABLE "flashcard_reviews" (
	"learner_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"rating" "flashcard_rating" NOT NULL,
	"review_count" integer DEFAULT 1 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flashcard_reviews_learner_id_question_id_pk" PRIMARY KEY("learner_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;