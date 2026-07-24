import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as parentsController from "./parents.controller";

const router = Router();
router.use(authenticate, authorize("PARENT"));

router.get("/me/children", parentsController.listMyChildren);

export default router;
