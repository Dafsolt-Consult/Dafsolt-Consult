import { Router } from "express";
import * as dashboardSummaryController from "./dashboard-summary.controller";

// Unauthenticated by design, same posture as modules/sso — the whole
// point is to accept a dafsolt-core-issued identity and return read-only
// aggregate data without an existing School Manager session. CORS and
// rate limiting for this route are applied where it's mounted (app.ts),
// not here.
const router = Router();

router.post("/", dashboardSummaryController.summary);

export default router;
