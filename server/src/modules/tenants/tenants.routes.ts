import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as tenantsController from "./tenants.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("SUPER_ADMIN"), tenantsController.listTenants);
router.get("/me", authorize("SCHOOL_ADMIN"), tenantsController.getCurrentTenant);
router.patch("/me", authorize("SCHOOL_ADMIN"), auditLog("UPDATE_SCHOOL_PROFILE", "Tenant"), tenantsController.updateCurrentTenant);
router.get("/:tenantId", authorize("SUPER_ADMIN"), tenantsController.getTenantById);
router.patch(
  "/:tenantId/subscription",
  authorize("SUPER_ADMIN"),
  auditLog("UPDATE_SUBSCRIPTION", "Tenant"),
  tenantsController.updateSubscription
);

export default router;
