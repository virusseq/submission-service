ALTER TABLE "submission"."record_analysis_map" ADD COLUMN "system_id" varchar(255);--> statement-breakpoint
CREATE INDEX "submission_id_idx" ON "submission"."record_analysis_map" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "system_id_idx" ON "submission"."record_analysis_map" USING btree ("system_id");