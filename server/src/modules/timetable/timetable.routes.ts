import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as timetableController from "./timetable.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/", staffRoles, timetableController.listTimetableSlots);
router.post("/", adminOnly, auditLog("CREATE_TIMETABLE_SLOT", "TimetableSlot"), timetableController.createTimetableSlot);
router.patch("/:slotId", adminOnly, auditLog("UPDATE_TIMETABLE_SLOT", "TimetableSlot"), timetableController.updateTimetableSlot);
router.delete("/:slotId", adminOnly, auditLog("DELETE_TIMETABLE_SLOT", "TimetableSlot"), timetableController.deleteTimetableSlot);
router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  timetableController.getStudentTimetable
);

export default router;
