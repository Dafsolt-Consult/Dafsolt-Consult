import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as usersController from "./users.controller";

const router = Router();
router.use(authenticate, authorize("SCHOOL_ADMIN"));

router.get("/", usersController.listStaff);
router.post("/", usersController.createStaff);
router.patch("/:userId", usersController.updateUser);

export default router;
