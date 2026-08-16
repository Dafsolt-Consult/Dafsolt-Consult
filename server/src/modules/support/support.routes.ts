import { Router } from "express";
import * as supportController from "./support.controller";

// Deliberately unauthenticated — the widget must work for anonymous
// landing-page visitors, and an unguarded route serves a logged-in session
// just as well. Never touches tenant/student/fee data; see
// SupportChatService's own docblock for why that's the whole point.
const router = Router();

router.post("/chat", supportController.respond);

export default router;
