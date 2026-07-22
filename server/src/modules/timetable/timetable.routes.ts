import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as timetableController from "./timetable.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/", staffRoles, timetableController.listPeriods);
router.post("/", adminOnly, timetableController.createPeriod);
router.patch("/:periodId", adminOnly, timetableController.updatePeriod);
router.delete("/:periodId", adminOnly, timetableController.deletePeriod);

router.get(
  "/teachers/:teacherId",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  timetableController.listForTeacher
);
router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  timetableController.listForStudent
);

export default router;
