import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as calendarController from "./calendar.controller";

const router = Router();
router.use(authenticate);

router.get("/", calendarController.listEvents);
router.post("/", authorize("SCHOOL_ADMIN"), calendarController.createEvent);
router.patch("/:eventId", authorize("SCHOOL_ADMIN"), calendarController.updateEvent);
router.delete("/:eventId", authorize("SCHOOL_ADMIN"), calendarController.deleteEvent);

export default router;
