import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import {
  checkOutSchema,
  createAllocationSchema,
  createHostelSchema,
  createRoomSchema,
  recordHostelPaymentSchema,
  updateHostelSchema,
  updateRoomSchema,
} from "./hostel.schema";

// ── Hostels ─────────────────────────────────────────────────────────────

export const listHostels = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const hostels = await prisma.hostel.findMany({
    where: { tenantId },
    include: {
      warden: { select: { firstName: true, lastName: true } },
      _count: { select: { rooms: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json(hostels);
});

export const createHostel = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createHostelSchema.parse(req.body);
  const hostel = await prisma.hostel.create({ data: { ...input, tenantId } });
  res.status(201).json(hostel);
});

export const updateHostel = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateHostelSchema.parse(req.body);
  const existing = await prisma.hostel.findFirst({ where: { id: req.params.hostelId, tenantId } });
  if (!existing) throw ApiError.notFound("Hostel not found");
  const hostel = await prisma.hostel.update({ where: { id: existing.id }, data: input });
  res.json(hostel);
});

// ── Rooms ───────────────────────────────────────────────────────────────

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { hostelId } = req.query as Record<string, string | undefined>;

  const rooms = await prisma.room.findMany({
    where: { tenantId, hostelId },
    include: { hostel: true, _count: { select: { allocations: { where: { isActive: true } } } } },
    orderBy: [{ hostelId: "asc" }, { number: "asc" }],
  });

  res.json(
    rooms.map((r) => ({
      ...r,
      occupancy: r._count.allocations,
      available: r.capacity - r._count.allocations,
    }))
  );
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createRoomSchema.parse(req.body);

  const hostel = await prisma.hostel.findFirst({ where: { id: input.hostelId, tenantId } });
  if (!hostel) throw ApiError.notFound("Hostel not found");

  const room = await prisma.room.create({ data: { ...input, tenantId }, include: { hostel: true } });
  res.status(201).json(room);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateRoomSchema.parse(req.body);
  const existing = await prisma.room.findFirst({ where: { id: req.params.roomId, tenantId } });
  if (!existing) throw ApiError.notFound("Room not found");
  const room = await prisma.room.update({ where: { id: existing.id }, data: input });
  res.json(room);
});

// ── Allocations ─────────────────────────────────────────────────────────

export const listAllocations = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { roomId, hostelId, isActive } = req.query as Record<string, string | undefined>;

  const allocations = await prisma.roomAllocation.findMany({
    where: {
      tenantId,
      roomId,
      isActive: isActive === undefined ? undefined : isActive === "true",
      room: hostelId ? { hostelId } : undefined,
    },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      room: { include: { hostel: true } },
    },
    orderBy: { checkInDate: "desc" },
  });

  res.json(allocations.map((a) => ({ ...a, balance: a.feeAmount - a.amountPaid })));
});

export const getStudentAllocation = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);

  const allocation = await prisma.roomAllocation.findFirst({
    where: { tenantId, studentId, isActive: true },
    include: { room: { include: { hostel: true } } },
  });

  res.json(allocation ? { ...allocation, balance: allocation.feeAmount - allocation.amountPaid } : null);
});

export const createAllocation = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createAllocationSchema.parse(req.body);

  const student = await prisma.student.findFirst({ where: { id: input.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const room = await prisma.room.findFirst({
    where: { id: input.roomId, tenantId },
    include: { _count: { select: { allocations: { where: { isActive: true } } } } },
  });
  if (!room) throw ApiError.notFound("Room not found");
  if (room._count.allocations >= room.capacity) throw ApiError.conflict("This room is already at full capacity");

  const existing = await prisma.roomAllocation.findFirst({
    where: { tenantId, studentId: input.studentId, sessionId: input.sessionId, isActive: true },
  });
  if (existing) throw ApiError.conflict("This student already has an active room allocation for this session");

  const allocation = await prisma.roomAllocation.create({
    data: { ...input, tenantId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } }, room: { include: { hostel: true } } },
  });

  res.status(201).json(allocation);
});

export const checkOutAllocation = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = checkOutSchema.parse(req.body);
  const existing = await prisma.roomAllocation.findFirst({ where: { id: req.params.allocationId, tenantId } });
  if (!existing) throw ApiError.notFound("Allocation not found");

  const allocation = await prisma.roomAllocation.update({
    where: { id: existing.id },
    data: { isActive: false, checkOutDate: input.checkOutDate ?? new Date() },
  });
  res.json(allocation);
});

// ── Payments ────────────────────────────────────────────────────────────

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = recordHostelPaymentSchema.parse(req.body);

  const allocation = await prisma.roomAllocation.findFirst({ where: { id: input.allocationId, tenantId } });
  if (!allocation) throw ApiError.notFound("Allocation not found");

  const [payment, updatedAllocation] = await prisma.$transaction(async (tx) => {
    const payment = await tx.hostelPayment.create({
      data: {
        tenantId,
        allocationId: allocation.id,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        recordedById: req.auth!.userId,
      },
    });
    const updatedAllocation = await tx.roomAllocation.update({
      where: { id: allocation.id },
      data: { amountPaid: allocation.amountPaid + input.amount },
    });
    return [payment, updatedAllocation];
  });

  res.status(201).json({ payment, allocation: updatedAllocation });
});
