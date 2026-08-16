import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { AccountContextBuilder } from "../../domain/assistant/AccountContextBuilder";
import { AssistantChatService } from "../../domain/assistant/AssistantChatService";
import { assistantChatSchema } from "./assistant.schema";

const contextBuilder = new AccountContextBuilder();
const chat = new AssistantChatService();

export const respond = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = assistantChatSchema.parse(req.body);

  const context = await contextBuilder.build(req.auth);
  const result = await chat.respond(context, input.history ?? [], input.message);

  res.json(result);
});
