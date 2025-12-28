-- AlterTable
ALTER TABLE "students" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_shareToken_key" ON "students"("shareToken");



