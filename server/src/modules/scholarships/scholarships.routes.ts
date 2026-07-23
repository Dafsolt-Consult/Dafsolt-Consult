import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as scholarshipsController from "./scholarships.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "ACCOUNTANT");

router.get("/", authorize("SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"), scholarshipsController.listScholarships);
router.post("/", staffRoles, auditLog("CREATE_SCHOLARSHIP", "Scholarship"), scholarshipsController.createScholarship);
router.patch(
  "/:scholarshipId",
  staffRoles,
  auditLog("UPDATE_SCHOLARSHIP", "Scholarship"),
  scholarshipsController.updateScholarship
);

export default router;
