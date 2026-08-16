import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SupportChatService } from "../../domain/support/SupportChatService";
import { supportChatSchema } from "./support.schema";

const chat = new SupportChatService();

export const respond = asyncHandler(async (req: Request, res: Response) => {
  const input = supportChatSchema.parse(req.body);
  const reply = await chat.respond(input.history ?? [], input.message);
  res.json({ reply });
});
