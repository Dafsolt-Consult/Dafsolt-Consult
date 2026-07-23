import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import {
  createAssignmentSchema,
  createDriverSchema,
  createRouteSchema,
  createVehicleSchema,
  updateAssignmentSchema,
  updateDriverSchema,
  updateRouteSchema,
  updateVehicleLocationSchema,
  updateVehicleSchema,
} from "./transport.schema";

// ── Drivers ─────────────────────────────────────────────────────────────

export const listDrivers = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const drivers = await prisma.driver.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  res.json(drivers);
});

export const createDriver = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createDriverSchema.parse(req.body);
  const driver = await prisma.driver.create({ data: { ...input, tenantId } });
  res.status(201).json(driver);
});

export const updateDriver = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateDriverSchema.parse(req.body);
  const existing = await prisma.driver.findFirst({ where: { id: req.params.driverId, tenantId } });
  if (!existing) throw ApiError.notFound("Driver not found");
  const driver = await prisma.driver.update({ where: { id: existing.id }, data: input });
  res.json(driver);
});

// ── Vehicles ────────────────────────────────────────────────────────────

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId }, include: { driver: true }, orderBy: { plateNumber: "asc" } });
  res.json(vehicles);
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createVehicleSchema.parse(req.body);
  const vehicle = await prisma.vehicle.create({ data: { ...input, tenantId }, include: { driver: true } });
  res.status(201).json(vehicle);
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateVehicleSchema.parse(req.body);
  const existing = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, tenantId } });
  if (!existing) throw ApiError.notFound("Vehicle not found");
  const vehicle = await prisma.vehicle.update({ where: { id: existing.id }, data: input, include: { driver: true } });
  res.json(vehicle);
});

/** Records a location ping — the closest this MVP gets to "GPS tracking"
 * without hardware/telematics integration: the vehicle (or its driver's
 * phone) posts its current coordinates periodically. */
export const updateVehicleLocation = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateVehicleLocationSchema.parse(req.body);
  const existing = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, tenantId } });
  if (!existing) throw ApiError.notFound("Vehicle not found");
  const vehicle = await prisma.vehicle.update({
    where: { id: existing.id },
    data: { lastLat: input.lat, lastLng: input.lng, lastLocatedAt: new Date() },
  });
  res.json(vehicle);
});

// ── Routes ──────────────────────────────────────────────────────────────

export const listRoutes = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const routes = await prisma.busRoute.findMany({
    where: { tenantId },
    include: { vehicle: true, driver: true, _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
  });
  res.json(routes);
});

export const createRoute = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createRouteSchema.parse(req.body);
  const route = await prisma.busRoute.create({ data: { ...input, tenantId }, include: { vehicle: true, driver: true } });
  res.status(201).json(route);
});

export const updateRoute = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateRouteSchema.parse(req.body);
  const existing = await prisma.busRoute.findFirst({ where: { id: req.params.routeId, tenantId } });
  if (!existing) throw ApiError.notFound("Route not found");
  const route = await prisma.busRoute.update({ where: { id: existing.id }, data: input, include: { vehicle: true, driver: true } });
  res.json(route);
});

export const deleteRoute = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.busRoute.findFirst({ where: { id: req.params.routeId, tenantId } });
  if (!existing) throw ApiError.notFound("Route not found");
  await prisma.busRoute.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// ── Student assignments ────────────────────────────────────────────────

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { routeId } = req.query as Record<string, string | undefined>;
  const assignments = await prisma.studentTransportAssignment.findMany({
    where: { tenantId, routeId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } }, route: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(assignments);
});

export const getStudentAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const assignment = await prisma.studentTransportAssignment.findFirst({
    where: { tenantId, studentId, isActive: true },
    include: { route: { include: { vehicle: true, driver: true } } },
  });
  res.json(assignment);
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createAssignmentSchema.parse(req.body);

  const student = await prisma.student.findFirst({ where: { id: input.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");
  const route = await prisma.busRoute.findFirst({ where: { id: input.routeId, tenantId } });
  if (!route) throw ApiError.notFound("Route not found");

  const assignment = await prisma.studentTransportAssignment.upsert({
    where: { tenantId_studentId_routeId: { tenantId, studentId: input.studentId, routeId: input.routeId } },
    update: { stopName: input.stopName, isActive: true },
    create: { ...input, tenantId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } }, route: true },
  });

  res.status(201).json(assignment);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateAssignmentSchema.parse(req.body);
  const existing = await prisma.studentTransportAssignment.findFirst({ where: { id: req.params.assignmentId, tenantId } });
  if (!existing) throw ApiError.notFound("Assignment not found");
  const assignment = await prisma.studentTransportAssignment.update({ where: { id: existing.id }, data: input });
  res.json(assignment);
});
