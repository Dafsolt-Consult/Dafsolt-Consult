import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as alumniController from "./alumni.controller";

const router = Router();
router.use(authenticate);

const readRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/", readRoles, alumniController.listAlumni);
router.get("/:alumnusId", readRoles, alumniController.getAlumnus);
router.post("/", adminOnly, auditLog("CREATE_ALUMNUS", "Alumnus"), alumniController.createAlumnus);
router.post(
  "/from-student/:studentId",
  adminOnly,
  auditLog("PROMOTE_STUDENT_TO_ALUMNUS", "Alumnus"),
  alumniController.promoteStudentToAlumnus
);
router.patch("/:alumnusId", adminOnly, auditLog("UPDATE_ALUMNUS", "Alumnus"), alumniController.updateAlumnus);
router.delete("/:alumnusId", adminOnly, auditLog("DELETE_ALUMNUS", "Alumnus"), alumniController.deleteAlumnus);

export default router;
