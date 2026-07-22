import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as auditController from "./audit.controller";

const router = Router();
router.use(authenticate, authorize("SCHOOL_ADMIN", "SUPER_ADMIN"));

router.get("/", auditController.listAuditLogs);

export default router;
