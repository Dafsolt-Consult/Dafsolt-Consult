import { Router } from "express";
import * as publicController from "./public.controller";

// Unauthenticated, non-tenant-scoped endpoints for the marketing site (the
// landing page's live Founding Schools Programme counter). No PII — just an
// aggregate count — so no auth/tenant guard is needed here; the global rate
// limiter in app.ts still applies.
const router = Router();

router.get("/signup-stats", publicController.getSignupStats);

export default router;
