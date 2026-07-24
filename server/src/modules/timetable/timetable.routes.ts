import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as timetableController from "./timetable.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/", staffRoles, timetableController.listPeriods);
router.post("/", adminOnly, auditLog("CREATE_TIMETABLE_PERIOD", "TimetablePeriod"), timetableController.createPeriod);
router.patch(
  "/:periodId",
  adminOnly,
  auditLog("UPDATE_TIMETABLE_PERIOD", "TimetablePeriod"),
  timetableController.updatePeriod
);
router.delete(
  "/:periodId",
  adminOnly,
  auditLog("DELETE_TIMETABLE_PERIOD", "TimetablePeriod"),
  timetableController.deletePeriod
);

router.get("/teachers/:teacherId", authorize("SCHOOL_ADMIN", "TEACHER"), timetableController.listForTeacher);
router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  timetableController.listForStudent
);

export default router;
