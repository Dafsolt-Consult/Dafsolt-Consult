import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as academicsController from "./academics.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER", "LIBRARIAN", "ACCOUNTANT");
const adminOnly = authorize("SCHOOL_ADMIN");
// Read-only academic structure (session/term names, class & subject lists) has
// no PII and is needed by the Student/Parent portals to resolve "the current
// term" for results, timetable, etc. — without this they 403 and every tab
// that depends on it silently renders empty.
const readRoles = authorize("SCHOOL_ADMIN", "TEACHER", "LIBRARIAN", "ACCOUNTANT", "STUDENT", "PARENT");

router.get("/sessions", readRoles, academicsController.listSessions);
router.post("/sessions", adminOnly, academicsController.createSession);
router.post("/terms", adminOnly, academicsController.createTerm);

router.get("/class-levels", readRoles, academicsController.listClassLevels);
router.post("/class-levels", adminOnly, academicsController.createClassLevel);

router.get("/class-arms", readRoles, academicsController.listClassArms);
router.post("/class-arms", adminOnly, academicsController.createClassArm);
router.patch("/class-arms/:classArmId", adminOnly, academicsController.updateClassArm);

router.get("/subjects", readRoles, academicsController.listSubjects);
router.post("/subjects", adminOnly, academicsController.createSubject);

router.get("/class-subjects", readRoles, academicsController.listClassSubjects);
router.post("/class-subjects", adminOnly, academicsController.assignClassSubject);

export default router;
