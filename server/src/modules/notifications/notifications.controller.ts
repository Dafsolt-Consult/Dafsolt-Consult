import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const notifications = await prisma.notificationLog.findMany({
    where: { userId: req.auth.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json(notifications);
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();

  const existing = await prisma.notificationLog.findFirst({ where: { id: req.params.notificationId, userId: req.auth.userId } });
  if (!existing) throw ApiError.notFound("Notification not found");

  const notification = await prisma.notificationLog.update({ where: { id: existing.id }, data: { readAt: new Date() } });
  res.json(notification);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  await prisma.notificationLog.updateMany({ where: { userId: req.auth.userId, readAt: null }, data: { readAt: new Date() } });
  res.status(204).send();
});
