import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as tenantsController from "./tenants.controller";

const router = Router();

router.use(authenticate);

router.get("/me", authorize("SCHOOL_ADMIN"), tenantsController.getCurrentTenant);
router.patch("/me", authorize("SCHOOL_ADMIN"), auditLog("UPDATE_SCHOOL_PROFILE", "Tenant"), tenantsController.updateCurrentTenant);

export default router;
