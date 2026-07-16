import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { createFeeStructureSchema, generateInvoicesSchema, recordPaymentSchema } from "./fees.schema";

export const listFeeStructures = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const structures = await prisma.feeStructure.findMany({
    where: { tenantId },
    include: { classLevel: true, session: true, term: true },
    orderBy: { name: "asc" },
  });
  res.json(structures);
});

export const createFeeStructure = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createFeeStructureSchema.parse(req.body);
  const structure = await prisma.feeStructure.create({ data: { ...input, tenantId } });
  res.status(201).json(structure);
});

export const generateInvoices = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = generateInvoicesSchema.parse(req.body);

  const feeStructure = await prisma.feeStructure.findFirst({ where: { id: input.feeStructureId, tenantId } });
  if (!feeStructure) throw ApiError.notFound("Fee structure not found");

  const enrollments = await prisma.enrollment.findMany({
    where: { classArmId: input.classArmId, sessionId: feeStructure.sessionId },
    select: { studentId: true },
  });

  const invoices = await Promise.all(
    enrollments.map(async ({ studentId }) => {
      const existing = await prisma.invoice.findFirst({ where: { studentId, feeStructureId: feeStructure.id } });
      if (existing) return existing;
      return prisma.invoice.create({
        data: {
          tenantId,
          studentId,
          feeStructureId: feeStructure.id,
          sessionId: feeStructure.sessionId,
          termId: feeStructure.termId,
          amount: feeStructure.amount,
          dueDate: input.dueDate,
        },
      });
    })
  );

  res.status(201).json({ generated: invoices.length, invoices });
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { studentId, status, termId } = req.query as Record<string, string | undefined>;

  const invoices = await prisma.invoice.findMany({
    where: { tenantId, studentId, termId, status: status as never },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      feeStructure: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(invoices);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = recordPaymentSchema.parse(req.body);

  const invoice = await prisma.invoice.findFirst({ where: { id: input.invoiceId, tenantId } });
  if (!invoice) throw ApiError.notFound("Invoice not found");

  const [payment, updatedInvoice] = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        recordedById: req.auth!.userId,
      },
    });

    const newAmountPaid = invoice.amountPaid + input.amount;
    const status = newAmountPaid >= invoice.amount ? "PAID" : newAmountPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, status },
    });

    return [payment, updatedInvoice];
  });

  res.status(201).json({ payment, invoice: updatedInvoice });
});
