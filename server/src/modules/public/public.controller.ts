import { Request, Response, NextFunction } from "express";
import * as publicService from "./public.service";

export async function getSignupStats(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicService.getSignupStats());
  } catch (err) {
    next(err);
  }
}

export async function postLandingView(req: Request, res: Response, next: NextFunction) {
  try {
    const visitorId = typeof req.body?.visitorId === "string" ? req.body.visitorId.slice(0, 64) : "";
    const phase = req.body?.phase === "leave" ? "leave" : "enter";
    if (visitorId) {
      await publicService.recordLandingView(visitorId, phase);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
