import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as usersController from "./users.controller";

const router = Router();
router.use(authenticate, authorize("SCHOOL_ADMIN"));

router.get("/", usersController.listStaff);
router.post("/", auditLog("CREATE_STAFF", "User"), usersController.createStaff);
router.patch("/:userId", auditLog("UPDATE_STAFF", "User"), usersController.updateUser);

export default router;
