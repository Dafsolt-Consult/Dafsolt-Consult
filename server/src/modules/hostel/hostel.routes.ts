import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as hostelController from "./hostel.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "HOSTEL_WARDEN");

router.get("/hostels", staffRoles, hostelController.listHostels);
router.post("/hostels", staffRoles, auditLog("CREATE_HOSTEL", "Hostel"), hostelController.createHostel);
router.patch("/hostels/:hostelId", staffRoles, auditLog("UPDATE_HOSTEL", "Hostel"), hostelController.updateHostel);

router.get("/rooms", staffRoles, hostelController.listRooms);
router.post("/rooms", staffRoles, auditLog("CREATE_ROOM", "Room"), hostelController.createRoom);
router.patch("/rooms/:roomId", staffRoles, auditLog("UPDATE_ROOM", "Room"), hostelController.updateRoom);

router.get("/allocations", staffRoles, hostelController.listAllocations);
router.post(
  "/allocations",
  staffRoles,
  auditLog("CREATE_ROOM_ALLOCATION", "RoomAllocation"),
  hostelController.createAllocation
);
router.post(
  "/allocations/:allocationId/checkout",
  staffRoles,
  auditLog("CHECKOUT_ROOM_ALLOCATION", "RoomAllocation"),
  hostelController.checkOutAllocation
);
router.get(
  "/allocations/students/:studentId",
  authorize("SCHOOL_ADMIN", "HOSTEL_WARDEN", "STUDENT", "PARENT"),
  hostelController.getStudentAllocation
);

router.post("/payments", staffRoles, auditLog("RECORD_HOSTEL_PAYMENT", "HostelPayment"), hostelController.recordPayment);

export default router;
