import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as complianceController from "./compliance.controller";

const router = Router();
router.use(authenticate, authorize("SCHOOL_ADMIN"));

router.get("/attendance", complianceController.attendanceCompliance);
router.get("/fees", complianceController.feeCompliance);
router.get("/audit-log", complianceController.listAuditLogs);
router.get("/data-completeness", complianceController.dataCompleteness);

export default router;
