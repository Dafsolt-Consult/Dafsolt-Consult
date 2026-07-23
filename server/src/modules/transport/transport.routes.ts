import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as transportController from "./transport.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "TRANSPORT_OFFICER");

router.get("/drivers", staffRoles, transportController.listDrivers);
router.post("/drivers", staffRoles, auditLog("CREATE_DRIVER", "Driver"), transportController.createDriver);
router.patch("/drivers/:driverId", staffRoles, auditLog("UPDATE_DRIVER", "Driver"), transportController.updateDriver);

router.get("/vehicles", staffRoles, transportController.listVehicles);
router.post("/vehicles", staffRoles, auditLog("CREATE_VEHICLE", "Vehicle"), transportController.createVehicle);
router.patch("/vehicles/:vehicleId", staffRoles, auditLog("UPDATE_VEHICLE", "Vehicle"), transportController.updateVehicle);
router.post("/vehicles/:vehicleId/location", staffRoles, transportController.updateVehicleLocation);

router.get("/routes", staffRoles, transportController.listRoutes);
router.post("/routes", staffRoles, auditLog("CREATE_ROUTE", "BusRoute"), transportController.createRoute);
router.patch("/routes/:routeId", staffRoles, auditLog("UPDATE_ROUTE", "BusRoute"), transportController.updateRoute);
router.delete("/routes/:routeId", staffRoles, auditLog("DELETE_ROUTE", "BusRoute"), transportController.deleteRoute);

router.get("/assignments", staffRoles, transportController.listAssignments);
router.post(
  "/assignments",
  staffRoles,
  auditLog("CREATE_TRANSPORT_ASSIGNMENT", "StudentTransportAssignment"),
  transportController.createAssignment
);
router.patch(
  "/assignments/:assignmentId",
  staffRoles,
  auditLog("UPDATE_TRANSPORT_ASSIGNMENT", "StudentTransportAssignment"),
  transportController.updateAssignment
);
router.get(
  "/assignments/students/:studentId",
  authorize("SCHOOL_ADMIN", "TRANSPORT_OFFICER", "STUDENT", "PARENT"),
  transportController.getStudentAssignment
);

export default router;
