import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as resultsController from "./results.controller";

const router = Router();
router.use(authenticate);

router.get("/", authorize("SCHOOL_ADMIN", "TEACHER"), resultsController.listResults);
router.post("/", authorize("SCHOOL_ADMIN", "TEACHER"), resultsController.upsertResult);
router.post("/report-cards/generate", authorize("SCHOOL_ADMIN"), resultsController.generateReportCards);
router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  resultsController.studentResultSheet
);
router.get(
  "/report-cards/:studentId/:termId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  resultsController.getReportCard
);

export default router;
