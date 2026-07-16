import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as tenantsController from "./tenants.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("SUPER_ADMIN"), tenantsController.listTenants);
router.get("/me", authorize("SCHOOL_ADMIN"), tenantsController.getCurrentTenant);
router.patch("/me", authorize("SCHOOL_ADMIN"), tenantsController.updateCurrentTenant);
router.get("/:tenantId", authorize("SUPER_ADMIN"), tenantsController.getTenantById);
router.patch("/:tenantId/subscription", authorize("SUPER_ADMIN"), tenantsController.updateSubscription);

export default router;
