import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { resolveTenantId } from "../../middleware/auth";
import { enrollmentTrend, attendanceTrend, feeCollectionByTerm, examPerformance } from "./analytics.service";

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);

  const [enrollment, attendance, feeCollection, exams] = await Promise.all([
    enrollmentTrend(tenantId),
    attendanceTrend(tenantId),
    feeCollectionByTerm(tenantId),
    examPerformance(tenantId),
  ]);

  res.json({ enrollmentTrend: enrollment, attendanceTrend: attendance, feeCollectionByTerm: feeCollection, examPerformance: exams });
});
