import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as attendanceController from "./attendance.controller";

const router = Router();
router.use(authenticate);

router.get("/", authorize("SCHOOL_ADMIN", "TEACHER"), attendanceController.listAttendance);
router.post("/", authorize("SCHOOL_ADMIN", "TEACHER"), attendanceController.markAttendance);
router.get(
  "/students/:studentId/summary",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  attendanceController.attendanceSummary
);

export default router;
