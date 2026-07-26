import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticatePlatform, authorizePlatform } from "../../middleware/platformAuth";
import { auditLog } from "../../middleware/audit";
import * as platformController from "./platform.controller";
import * as globalQuestionsController from "./globalQuestions.controller";
import * as schoolGroupsController from "../school-groups/school-groups.controller";

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

router.get("/school-groups", schoolGroupsController.listSchoolGroups);
router.post(
  "/school-groups",
  authorizePlatform("OWNER"),
  auditLog("CREATE_SCHOOL_GROUP", "SchoolGroup"),
  schoolGroupsController.createSchoolGroup
);
router.get("/school-groups/:groupId", schoolGroupsController.getSchoolGroupById);
router.patch(
  "/school-groups/:groupId",
  authorizePlatform("OWNER"),
  auditLog("UPDATE_SCHOOL_GROUP", "SchoolGroup"),
  schoolGroupsController.updateSchoolGroup
);
router.get("/school-groups/:groupId/report", schoolGroupsController.getGroupConsolidatedReport);
router.post(
  "/school-groups/:groupId/tenants",
  authorizePlatform("OWNER"),
  auditLog("ASSIGN_TENANT_TO_GROUP", "Tenant"),
  schoolGroupsController.assignTenantToGroup
);
router.delete(
  "/school-groups/tenants/:tenantId",
  authorizePlatform("OWNER"),
  auditLog("REMOVE_TENANT_FROM_GROUP", "Tenant"),
  schoolGroupsController.removeTenantFromGroup
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

// Shared exam-practice content library (WAEC/NECO/UTME-style questions),
// visible to every tenant — see cbt/practiceLibrary.controller.ts for the
// tenant-facing browse/import side.
router.get("/global-subjects", globalQuestionsController.listGlobalSubjects);
router.post(
  "/global-subjects",
  authorizePlatform("OWNER"),
  auditLog("CREATE_GLOBAL_SUBJECT", "GlobalSubject"),
  globalQuestionsController.createGlobalSubject
);
router.get("/global-questions", globalQuestionsController.listGlobalQuestions);
router.post(
  "/global-questions",
  authorizePlatform("OWNER"),
  auditLog("CREATE_GLOBAL_QUESTION", "GlobalQuestion"),
  globalQuestionsController.createGlobalQuestion
);
router.patch(
  "/global-questions/:questionId",
  authorizePlatform("OWNER"),
  auditLog("UPDATE_GLOBAL_QUESTION", "GlobalQuestion"),
  globalQuestionsController.updateGlobalQuestion
);
router.delete(
  "/global-questions/:questionId",
  authorizePlatform("OWNER"),
  auditLog("DELETE_GLOBAL_QUESTION", "GlobalQuestion"),
  globalQuestionsController.deleteGlobalQuestion
);

export default router;
