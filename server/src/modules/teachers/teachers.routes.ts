import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as teachersController from "./teachers.controller";

const router = Router();
router.use(authenticate, authorize("SCHOOL_ADMIN"));

router.get("/", teachersController.listTeachers);
router.get("/:teacherId", teachersController.getTeacher);

export default router;
