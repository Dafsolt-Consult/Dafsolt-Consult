import { Router } from "express";
import * as ssoController from "./sso.controller";

// Unauthenticated by design — the whole point of this route is to accept a
// dafsolt-core-issued identity in exchange for a School Manager session.
// CORS and rate limiting for this route are applied where it's mounted
// (see app.ts), not here.
const router = Router();

router.post("/callback", ssoController.callback);

export default router;
