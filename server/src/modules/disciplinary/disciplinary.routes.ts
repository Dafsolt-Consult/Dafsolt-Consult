import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as disciplinaryController from "./disciplinary.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TEACHER");

router.get("/", staffRoles, disciplinaryController.listDisciplinaryRecords);
router.post(
  "/",
  staffRoles,
  auditLog("CREATE_DISCIPLINARY_RECORD", "DisciplinaryRecord"),
  disciplinaryController.createDisciplinaryRecord
);
router.patch(
  "/:recordId",
  staffRoles,
  auditLog("UPDATE_DISCIPLINARY_RECORD", "DisciplinaryRecord"),
  disciplinaryController.updateDisciplinaryRecord
);
router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  disciplinaryController.getStudentDisciplinaryRecords
);

export default router;
