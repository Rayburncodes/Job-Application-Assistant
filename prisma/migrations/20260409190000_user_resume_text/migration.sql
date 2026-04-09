-- AlterTable (IF NOT EXISTS: safe if column was added manually or by an older migration name)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resumeText" TEXT;
