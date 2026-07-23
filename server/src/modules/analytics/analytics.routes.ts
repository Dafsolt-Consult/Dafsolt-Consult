import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as analyticsController from "./analytics.controller";

const router = Router();
router.use(authenticate, authorize("SCHOOL_ADMIN", "SUPER_ADMIN"));

router.get("/overview", analyticsController.getOverview);

export default router;
