import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as questionsController from "./questions.controller";
import * as examsController from "./exams.controller";
import * as attemptsController from "./attempts.controller";
import * as practiceLibraryController from "./practiceLibrary.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");

// Question bank
router.get("/questions", staffRoles, questionsController.listQuestions);
router.post("/questions", staffRoles, questionsController.createQuestion);
router.post("/questions/bulk", staffRoles, questionsController.bulkCreateQuestions);
router.patch("/questions/:questionId", staffRoles, questionsController.updateQuestion);
router.delete("/questions/:questionId", staffRoles, questionsController.deleteQuestion);

// Exam builder (staff)
router.get("/exams", staffRoles, examsController.listExams);
router.post("/exams", staffRoles, examsController.createExam);

// Student exam-taking (must be registered before the "/exams/:examId" param route)
router.get("/exams/available", authorize("STUDENT"), attemptsController.listAvailableExams);
router.post("/exams/:examId/start", authorize("STUDENT"), attemptsController.startAttempt);

router.get("/exams/:examId", staffRoles, examsController.getExam);
router.patch("/exams/:examId", staffRoles, examsController.updateExam);
router.post("/exams/:examId/questions", staffRoles, examsController.addExamQuestions);
router.delete("/exams/:examId/questions/:questionId", staffRoles, examsController.removeExamQuestion);
router.get("/exams/:examId/results", staffRoles, examsController.examResultsOverview);
router.get("/attempts/:attemptId", authorize("STUDENT"), attemptsController.getAttempt);
router.post("/attempts/:attemptId/answers", authorize("STUDENT"), attemptsController.answerQuestion);
router.post("/attempts/:attemptId/submit", authorize("STUDENT"), attemptsController.submitAttempt);
router.get(
  "/attempts/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  attemptsController.listAttemptsForStudent
);

// Manual grading (staff)
router.get("/attempts/:attemptId/grading", staffRoles, attemptsController.listAttemptAnswersForGrading);
router.patch("/attempts/:attemptId/answers/:answerId/grade", staffRoles, attemptsController.gradeAnswer);

// Shared exam-practice library (WAEC/NECO/UTME-style questions) — browse and
// import into this tenant's own question bank. See platform/globalQuestions
// for the platform-admin authoring side.
router.get("/practice-library/subjects", staffRoles, practiceLibraryController.listPracticeSubjects);
router.get("/practice-library/questions", staffRoles, practiceLibraryController.listPracticeQuestions);
router.post("/practice-library/import", staffRoles, practiceLibraryController.importPracticeQuestions);

export default router;
