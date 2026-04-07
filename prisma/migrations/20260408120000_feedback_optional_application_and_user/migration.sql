-- AlterTable
ALTER TABLE "Feedback" ALTER COLUMN "applicationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
