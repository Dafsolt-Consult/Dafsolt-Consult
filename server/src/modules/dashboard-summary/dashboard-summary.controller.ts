import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { dashboardSummarySchema } from "./dashboard-summary.schema";
import * as dashboardSummaryService from "./dashboard-summary.service";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const { token } = dashboardSummarySchema.parse(req.body);
  const result = await dashboardSummaryService.summary(token);
  res.json(result);
});
