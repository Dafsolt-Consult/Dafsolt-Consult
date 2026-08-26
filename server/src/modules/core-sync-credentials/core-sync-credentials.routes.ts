import { Router } from "express";
import * as coreSyncCredentialsController from "./core-sync-credentials.controller";

const router = Router();

router.post("/", coreSyncCredentialsController.receive);

export default router;
