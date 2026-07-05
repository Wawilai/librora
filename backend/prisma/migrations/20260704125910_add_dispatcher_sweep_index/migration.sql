-- CreateIndex
CREATE INDEX "processing_jobs_dispatch_status_scheduled_at_idx" ON "processing_jobs"("dispatch_status", "scheduled_at");

