import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as assignmentsController from "./assignments.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");

router.get("/", staffRoles, assignmentsController.listAssignments);
router.post("/", staffRoles, assignmentsController.createAssignment);

router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  assignmentsController.listAssignmentsForStudent
);

router.get("/:assignmentId", staffRoles, assignmentsController.getAssignment);
router.patch("/:assignmentId", staffRoles, assignmentsController.updateAssignment);
router.delete("/:assignmentId", staffRoles, assignmentsController.deleteAssignment);
router.post("/:assignmentId/submit", authorize("STUDENT"), assignmentsController.submitAssignment);
router.patch("/:assignmentId/submissions/:studentId/grade", staffRoles, assignmentsController.gradeSubmission);

export default router;
