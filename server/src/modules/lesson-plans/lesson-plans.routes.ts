import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as lessonPlansController from "./lesson-plans.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");

router.get("/", staffRoles, lessonPlansController.listLessonPlans);
router.post("/", staffRoles, lessonPlansController.createLessonPlan);
router.get("/:lessonPlanId", staffRoles, lessonPlansController.getLessonPlan);
router.patch("/:lessonPlanId", staffRoles, lessonPlansController.updateLessonPlan);
router.delete("/:lessonPlanId", staffRoles, lessonPlansController.deleteLessonPlan);

export default router;
