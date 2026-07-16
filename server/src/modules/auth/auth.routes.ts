import { Router } from "express";
import * as authController from "./auth.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.post("/onboard", authController.onboardSchool);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authenticate, authController.me);

export default router;
