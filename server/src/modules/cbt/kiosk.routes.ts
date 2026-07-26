import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateKiosk } from "../../middleware/kioskAuth";
import * as kioskController from "./kiosk.controller";

// Deliberately its own router, NOT added into cbt.routes.ts — that router
// has `router.use(authenticate)` applied to the whole thing, which would
// wrongly gate a kiosk route behind the real tenant-user auth middleware.
const router = Router();

// Name + admission number isn't a real secret, but still rate-limit
// guessing attempts — keyed by IP + tenantSlug + admissionNumber together
// (not just IP), since admission numbers repeat across schools and one
// kiosk PC's traffic shouldn't throttle a different school's students.
const kioskLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const body = req.body as { tenantSlug?: string; admissionNumber?: string } | undefined;
    return `${req.ip}:${body?.tenantSlug ?? ""}:${body?.admissionNumber ?? ""}`;
  },
  message: { message: "Too many attempts, please try again later" },
});

router.post("/login", kioskLoginLimiter, kioskController.kioskLogin);

router.use(authenticateKiosk);
router.get("/exams/available", kioskController.kioskListAvailableExams);
router.post("/exams/:examId/start", kioskController.kioskStartAttempt);
router.get("/attempts/:attemptId", kioskController.kioskGetAttempt);
router.post("/attempts/:attemptId/answers", kioskController.kioskAnswerQuestion);
router.post("/attempts/:attemptId/submit", kioskController.kioskSubmitAttempt);

export default router;
