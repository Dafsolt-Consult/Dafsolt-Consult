import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import * as assistantController from "./assistant.controller";

// Authenticated counterpart to the public /api/support/chat above — see
// AssistantChatController's own docblock. Not tenant-guarded beyond
// `authenticate` itself, since AccountContextBuilder derives everything
// from req.auth.userId — it never trusts a client-supplied tenant/student
// id.
const router = Router();
router.use(authenticate);

router.post("/chat", assistantController.respond);

export default router;
