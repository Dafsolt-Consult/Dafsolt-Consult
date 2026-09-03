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

// Coarser companion to the per-admission-number limiter above. That one
// buckets by ip:tenantSlug:admissionNumber, so each distinct admission
// number gets its own fresh bucket — an attacker who knows/guesses a
// school's admission-number format can enumerate numbers all day without
// ever tripping it. This one buckets by ip:tenantSlug only, so it catches
// exactly that enumeration pattern regardless of which admission number is
// tried. Higher ceiling than the per-number limiter since one kiosk PC
// legitimately logs many different real students in over an exam day; both
// limiters apply together, neither replaces the other.
const kioskLoginTenantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const body = req.body as { tenantSlug?: string } | undefined;
    return `${req.ip}:${body?.tenantSlug ?? ""}`;
  },
  message: { message: "Too many attempts, please try again later" },
});

router.post("/login", kioskLoginTenantLimiter, kioskLoginLimiter, kioskController.kioskLogin);

router.use(authenticateKiosk);
router.get("/exams/available", kioskController.kioskListAvailableExams);
router.post("/exams/:examId/start", kioskController.kioskStartAttempt);
router.get("/attempts/:attemptId", kioskController.kioskGetAttempt);
router.post("/attempts/:attemptId/answers", kioskController.kioskAnswerQuestion);
router.post("/attempts/:attemptId/submit", kioskController.kioskSubmitAttempt);

export default router;
