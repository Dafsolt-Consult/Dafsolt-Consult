import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ssoCallbackSchema } from "./sso.schema";
import * as ssoService from "./sso.service";

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { token } = ssoCallbackSchema.parse(req.body);
  const result = await ssoService.callback(token);
  res.json(result);
});
