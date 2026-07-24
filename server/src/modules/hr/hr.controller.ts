import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import {
  createLeaveRequestSchema,
  createPayrollRunSchema,
  createPerformanceReviewSchema,
  markStaffAttendanceSchema,
  reviewLeaveRequestSchema,
  upsertPayslipSchema,
} from "./hr.schema";

const userSelect = { id: true, firstName: true, lastName: true, role: true } as const;

// ── Staff attendance ───────────────────────────────────────────────────

export const listStaffAttendance = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { userId, from, to } = req.query as Record<string, string | undefined>;

  const records = await prisma.staffAttendance.findMany({
    where: {
      tenantId,
      userId,
      date: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    },
    include: { user: { select: userSelect } },
    orderBy: { date: "desc" },
  });
  res.json(records);
});

export const markStaffAttendance = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = markStaffAttendanceSchema.parse(req.body);

  const staff = await prisma.user.findFirst({ where: { id: input.userId, tenantId } });
  if (!staff) throw ApiError.notFound("Staff member not found");

  const record = await prisma.staffAttendance.upsert({
    where: { userId_date: { userId: input.userId, date: input.date } },
    update: { status: input.status, remark: input.remark, recordedById: req.auth.userId },
    create: { ...input, tenantId, recordedById: req.auth.userId },
    include: { user: { select: userSelect } },
  });
  res.status(201).json(record);
});

// ── Leave requests ──────────────────────────────────────────────────────

export const listLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const isManager = req.auth.role === "SCHOOL_ADMIN" || req.auth.role === "HR_MANAGER";
  const { status, userId } = req.query as Record<string, string | undefined>;

  const requests = await prisma.leaveRequest.findMany({
    where: { tenantId, status: status as never, userId: isManager ? userId : req.auth.userId },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

export const createLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createLeaveRequestSchema.parse(req.body);

  const request = await prisma.leaveRequest.create({
    data: { ...input, tenantId, userId: req.auth.userId },
    include: { user: { select: userSelect } },
  });
  res.status(201).json(request);
});

export const reviewLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = reviewLeaveRequestSchema.parse(req.body);

  const existing = await prisma.leaveRequest.findFirst({ where: { id: req.params.requestId, tenantId } });
  if (!existing) throw ApiError.notFound("Leave request not found");

  const request = await prisma.leaveRequest.update({
    where: { id: existing.id },
    data: { status: input.status, reviewedById: req.auth.userId },
    include: { user: { select: userSelect } },
  });
  res.json(request);
});

// ── Payroll ─────────────────────────────────────────────────────────────

export const listPayrollRuns = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const runs = await prisma.payrollRun.findMany({
    where: { tenantId },
    include: { _count: { select: { payslips: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
  res.json(runs);
});

export const createPayrollRun = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createPayrollRunSchema.parse(req.body);

  const run = await prisma.payrollRun.create({ data: { ...input, tenantId, createdById: req.auth.userId } });
  res.status(201).json(run);
});

export const finalizePayrollRun = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.payrollRun.findFirst({ where: { id: req.params.runId, tenantId } });
  if (!existing) throw ApiError.notFound("Payroll run not found");
  const run = await prisma.payrollRun.update({ where: { id: existing.id }, data: { status: "FINALIZED" } });
  res.json(run);
});

export const listPayslips = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const payslips = await prisma.payslip.findMany({
    where: { tenantId, payrollRunId: req.params.runId },
    include: { user: { select: userSelect } },
    orderBy: { user: { firstName: "asc" } },
  });
  res.json(payslips);
});

export const upsertPayslip = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = upsertPayslipSchema.parse(req.body);

  const run = await prisma.payrollRun.findFirst({ where: { id: req.params.runId, tenantId } });
  if (!run) throw ApiError.notFound("Payroll run not found");
  if (run.status !== "DRAFT") throw ApiError.conflict("Only draft payroll runs can be edited");

  const netPay = input.basicSalary + input.allowances - input.deductions;
  const payslip = await prisma.payslip.upsert({
    where: { payrollRunId_userId: { payrollRunId: run.id, userId: input.userId } },
    update: { basicSalary: input.basicSalary, allowances: input.allowances, deductions: input.deductions, netPay },
    create: { ...input, netPay, tenantId, payrollRunId: run.id },
    include: { user: { select: userSelect } },
  });
  res.status(201).json(payslip);
});

export const markPayslipPaid = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.payslip.findFirst({ where: { id: req.params.payslipId, tenantId } });
  if (!existing) throw ApiError.notFound("Payslip not found");
  const payslip = await prisma.payslip.update({ where: { id: existing.id }, data: { paidAt: new Date() } });
  res.json(payslip);
});

export const listMyPayslips = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const payslips = await prisma.payslip.findMany({
    where: { tenantId, userId: req.auth.userId },
    include: { payrollRun: true },
    orderBy: [{ payrollRun: { periodYear: "desc" } }, { payrollRun: { periodMonth: "desc" } }],
  });
  res.json(payslips);
});

// ── Performance reviews ────────────────────────────────────────────────

export const listPerformanceReviews = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const isManager = req.auth.role === "SCHOOL_ADMIN" || req.auth.role === "HR_MANAGER";
  const { userId } = req.query as Record<string, string | undefined>;

  const reviews = await prisma.performanceReview.findMany({
    where: { tenantId, userId: isManager ? userId : req.auth.userId },
    include: { user: { select: userSelect }, reviewer: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

export const createPerformanceReview = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createPerformanceReviewSchema.parse(req.body);

  const staff = await prisma.user.findFirst({ where: { id: input.userId, tenantId } });
  if (!staff) throw ApiError.notFound("Staff member not found");

  const review = await prisma.performanceReview.create({
    data: { ...input, tenantId, reviewerId: req.auth.userId },
    include: { user: { select: userSelect }, reviewer: { select: userSelect } },
  });
  res.status(201).json(review);
});
