import { z } from "zod";

export const createDriverSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(5).max(30),
  licenseNumber: z.string().min(2).max(60),
  licenseExpiry: z.coerce.date().optional(),
});

export const updateDriverSchema = createDriverSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(2).max(30),
  model: z.string().max(100).optional(),
  capacity: z.number().int().positive().max(200).default(30),
  driverId: z.string().cuid().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const updateVehicleLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createRouteSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  vehicleId: z.string().cuid().optional(),
  driverId: z.string().cuid().optional(),
  stops: z.array(z.string().min(1).max(150)).min(1),
});

export const updateRouteSchema = createRouteSchema.partial();

export const createAssignmentSchema = z.object({
  studentId: z.string().cuid(),
  routeId: z.string().cuid(),
  stopName: z.string().min(1).max(150),
});

export const updateAssignmentSchema = z.object({
  isActive: z.boolean().optional(),
  stopName: z.string().min(1).max(150).optional(),
});
