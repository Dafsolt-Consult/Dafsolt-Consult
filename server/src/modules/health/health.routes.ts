import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as healthController from "./health.controller";

const router = Router();
router.use(authenticate);

const readRoles = authorize("SCHOOL_ADMIN", "NURSE", "TEACHER");
const writeRoles = authorize("SCHOOL_ADMIN", "NURSE");

router.get("/", readRoles, healthController.listHealthIncidents);
router.post(
  "/",
  writeRoles,
  auditLog("CREATE_HEALTH_INCIDENT", "HealthIncident"),
  healthController.createHealthIncident
);
router.patch(
  "/:incidentId",
  writeRoles,
  auditLog("UPDATE_HEALTH_INCIDENT", "HealthIncident"),
  healthController.updateHealthIncident
);

router.get("/records/:studentId", readRoles, healthController.getHealthRecord);
router.put(
  "/records/:studentId",
  writeRoles,
  auditLog("UPSERT_HEALTH_RECORD", "HealthRecord"),
  healthController.upsertHealthRecord
);

router.get(
  "/students/:studentId",
  authorize("SCHOOL_ADMIN", "NURSE", "TEACHER", "STUDENT", "PARENT"),
  healthController.getStudentHealthView
);

export default router;
