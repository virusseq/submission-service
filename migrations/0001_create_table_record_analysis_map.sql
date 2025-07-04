CREATE TABLE "submission"."record_analysis_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"record_identifier" varchar(255) NOT NULL,
	"analysis_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
