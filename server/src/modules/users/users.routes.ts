import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as usersController from "./users.controller";

const router = Router();
router.use(authenticate);

router.get("/", authorize("SCHOOL_ADMIN", "HR_MANAGER"), usersController.listStaff);
router.post("/", authorize("SCHOOL_ADMIN"), auditLog("CREATE_STAFF", "User"), usersController.createStaff);
router.patch("/:userId", authorize("SCHOOL_ADMIN"), auditLog("UPDATE_STAFF", "User"), usersController.updateUser);

export default router;
