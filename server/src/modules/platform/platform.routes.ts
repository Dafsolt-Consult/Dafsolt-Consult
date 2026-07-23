import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticatePlatform, authorizePlatform } from "../../middleware/platformAuth";
import { auditLog } from "../../middleware/audit";
import * as platformController from "./platform.controller";

const router = Router();

// Tighter than the tenant authLimiter (app.ts) — platform accounts are the
// highest-value target in the system. Keyed by IP + attempted email so
// rotating IPs against one account still gets throttled.
const platformLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body as { email?: string } | undefined)?.email ?? ""}`,
  message: { message: "Too many login attempts, please try again later" },
});

router.post("/auth/login", platformLoginLimiter, platformController.login);
router.post("/auth/refresh", platformController.refresh);
router.post("/auth/logout", platformController.logout);
router.get("/auth/me", authenticatePlatform, platformController.me);

router.use(authenticatePlatform);

router.get("/tenants", platformController.listTenants);
router.get("/tenants/:tenantId", platformController.getTenantById);
router.patch(
  "/tenants/:tenantId/subscription",
  authorizePlatform("OWNER"),
  auditLog("UPDATE_SUBSCRIPTION", "Tenant"),
  platformController.updateTenantSubscription
);
router.post(
  "/tenants/:tenantId/impersonate",
  authorizePlatform("OWNER", "SUPPORT"),
  platformController.impersonate
);

router.get("/admins", authorizePlatform("OWNER"), platformController.listAdmins);
router.post(
  "/admins",
  authorizePlatform("OWNER"),
  auditLog("CREATE_PLATFORM_ADMIN", "PlatformAdmin"),
  platformController.createAdmin
);
router.patch(
  "/admins/:adminId",
  authorizePlatform("OWNER"),
  auditLog("UPDATE_PLATFORM_ADMIN", "PlatformAdmin"),
  platformController.updateAdmin
);

router.get("/audit-log", platformController.listAuditLog);

export default router;
