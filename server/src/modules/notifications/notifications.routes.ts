import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import * as notificationsController from "./notifications.controller";

const router = Router();
router.use(authenticate);

router.get("/", notificationsController.listMyNotifications);
router.post("/read-all", notificationsController.markAllAsRead);
router.post("/:notificationId/read", notificationsController.markAsRead);

export default router;
