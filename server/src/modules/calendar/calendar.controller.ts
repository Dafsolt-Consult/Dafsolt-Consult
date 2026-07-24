import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { createCalendarEventSchema, updateCalendarEventSchema } from "./calendar.schema";

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { from, to } = req.query as Record<string, string | undefined>;

  const events = await prisma.calendarEvent.findMany({
    where: {
      tenantId,
      startDate: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    },
    orderBy: { startDate: "asc" },
  });

  res.json(events);
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createCalendarEventSchema.parse(req.body);

  const event = await prisma.calendarEvent.create({ data: { ...input, tenantId, createdById: req.auth.userId } });
  res.status(201).json(event);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateCalendarEventSchema.parse(req.body);
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.eventId, tenantId } });
  if (!existing) throw ApiError.notFound("Event not found");

  const event = await prisma.calendarEvent.update({ where: { id: existing.id }, data: input });
  res.json(event);
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.eventId, tenantId } });
  if (!existing) throw ApiError.notFound("Event not found");

  await prisma.calendarEvent.delete({ where: { id: existing.id } });
  res.status(204).send();
});
