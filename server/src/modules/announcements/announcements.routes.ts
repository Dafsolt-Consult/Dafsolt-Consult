import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as announcementsController from "./announcements.controller";

const router = Router();
router.use(authenticate);

router.get("/", announcementsController.listAnnouncements);
router.post("/", authorize("SCHOOL_ADMIN"), announcementsController.createAnnouncement);

export default router;
