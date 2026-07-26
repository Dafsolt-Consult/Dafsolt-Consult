import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyKioskAccessToken } from "../utils/kioskJwt";

export interface KioskAuthContext {
  studentId: string;
  tenantId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Deliberately separate from `req.auth` (middleware/auth.ts) — a
      // kiosk session has no backing User row at all, so it must never be
      // representable as (or mistaken for) a real AuthContext.
      kioskAuth?: KioskAuthContext;
    }
  }
}

export function authenticateKiosk(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyKioskAccessToken(token);
    req.kioskAuth = { studentId: payload.sub, tenantId: payload.tenantId };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired kiosk session");
  }
}
