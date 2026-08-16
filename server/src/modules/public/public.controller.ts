import { Request, Response, NextFunction } from "express";
import * as publicService from "./public.service";

export async function getSignupStats(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicService.getSignupStats());
  } catch (err) {
    next(err);
  }
}
