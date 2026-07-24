import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as academicsController from "./academics.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER", "LIBRARIAN", "ACCOUNTANT");
const adminOnly = authorize("SCHOOL_ADMIN");

router.get("/sessions", staffRoles, academicsController.listSessions);
router.post("/sessions", adminOnly, academicsController.createSession);
router.post("/terms", adminOnly, academicsController.createTerm);

router.get("/class-levels", staffRoles, academicsController.listClassLevels);
router.post("/class-levels", adminOnly, academicsController.createClassLevel);

router.get("/class-arms", staffRoles, academicsController.listClassArms);
router.post("/class-arms", adminOnly, academicsController.createClassArm);
router.patch("/class-arms/:classArmId", adminOnly, academicsController.updateClassArm);

router.get("/subjects", staffRoles, academicsController.listSubjects);
router.post("/subjects", adminOnly, academicsController.createSubject);

router.get("/class-subjects", staffRoles, academicsController.listClassSubjects);
router.post("/class-subjects", adminOnly, academicsController.assignClassSubject);

export default router;
