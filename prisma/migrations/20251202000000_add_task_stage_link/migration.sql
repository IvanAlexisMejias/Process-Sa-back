-- Add optional relation from Task to FlowStageStatus to track stage progress per instancia
ALTER TABLE "Task" ADD COLUMN "stageStatusId" TEXT;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_stageStatusId_fkey"
FOREIGN KEY ("stageStatusId") REFERENCES "FlowStageStatus"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
