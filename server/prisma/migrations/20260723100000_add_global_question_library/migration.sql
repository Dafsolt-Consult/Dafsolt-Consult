-- CreateEnum
CREATE TYPE "ExamBoard" AS ENUM ('WAEC', 'NECO', 'UTME', 'GENERAL');

-- CreateTable
CREATE TABLE "global_subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_questions" (
    "id" TEXT NOT NULL,
    "globalSubjectId" TEXT NOT NULL,
    "examBoard" "ExamBoard" NOT NULL,
    "stage" "SchoolStage" NOT NULL,
    "topic" TEXT,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "correctText" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_question_options" (
    "id" TEXT NOT NULL,
    "globalQuestionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "global_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_subjects_code_key" ON "global_subjects"("code");

-- CreateIndex
CREATE INDEX "global_questions_globalSubjectId_examBoard_stage_idx" ON "global_questions"("globalSubjectId", "examBoard", "stage");

-- AddForeignKey
ALTER TABLE "global_questions" ADD CONSTRAINT "global_questions_globalSubjectId_fkey" FOREIGN KEY ("globalSubjectId") REFERENCES "global_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_questions" ADD CONSTRAINT "global_questions_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_question_options" ADD CONSTRAINT "global_question_options_globalQuestionId_fkey" FOREIGN KEY ("globalQuestionId") REFERENCES "global_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
