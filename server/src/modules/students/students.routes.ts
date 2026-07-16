import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as studentsController from "./students.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/", staffRoles, studentsController.listStudents);
router.get("/:studentId", staffRoles, studentsController.getStudent);
router.post("/", adminOnly, studentsController.createStudent);
router.patch("/:studentId", adminOnly, studentsController.updateStudent);
router.post("/:studentId/enroll", adminOnly, studentsController.enrollStudent);

export default router;
