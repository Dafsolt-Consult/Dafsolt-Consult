import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as elearningController from "./elearning.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");
const studentFacing = authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT");

router.get("/materials", staffRoles, elearningController.listCourseMaterials);
router.post("/materials", staffRoles, elearningController.createCourseMaterial);
router.patch("/materials/:materialId", staffRoles, elearningController.updateCourseMaterial);
router.delete("/materials/:materialId", staffRoles, elearningController.deleteCourseMaterial);
router.get("/materials/students/:studentId", studentFacing, elearningController.listCourseMaterialsForStudent);

router.get("/sessions", staffRoles, elearningController.listOnlineClassSessions);
router.post("/sessions", staffRoles, elearningController.createOnlineClassSession);
router.patch("/sessions/:sessionId", staffRoles, elearningController.updateOnlineClassSession);
router.delete("/sessions/:sessionId", staffRoles, elearningController.deleteOnlineClassSession);
router.get("/sessions/students/:studentId", studentFacing, elearningController.listOnlineClassSessionsForStudent);

export default router;
