-- 完了実績を残したまま一覧から非表示にする
ALTER TABLE "Todo" ADD COLUMN "archivedAt" TIMESTAMP(3);

DROP INDEX "Todo_completed_createdAt_idx";
CREATE INDEX "Todo_archivedAt_completed_createdAt_idx" ON "Todo"("archivedAt", "completed", "createdAt");
CREATE INDEX "Todo_completedAt_idx" ON "Todo"("completedAt");
