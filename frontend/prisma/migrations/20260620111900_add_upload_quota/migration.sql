-- AlterTable
ALTER TABLE "User" ADD COLUMN     "uploadLimitSeconds" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "uploadSecondsUsed" INTEGER NOT NULL DEFAULT 0;
