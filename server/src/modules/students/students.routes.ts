import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as studentsController from "./students.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/", staffRoles, studentsController.listStudents);
router.get("/promotion-candidates", staffRoles, studentsController.listPromotionCandidates);
router.get("/:studentId", staffRoles, studentsController.getStudent);
router.post("/", adminOnly, auditLog("ADMIT_STUDENT", "Student"), studentsController.createStudent);
router.patch("/:studentId", adminOnly, auditLog("UPDATE_STUDENT", "Student"), studentsController.updateStudent);
router.post("/:studentId/enroll", adminOnly, studentsController.enrollStudent);
router.post("/:studentId/guardians", adminOnly, studentsController.addGuardian);

export default router;
