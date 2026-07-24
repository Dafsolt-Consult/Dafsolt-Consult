import { NextFunction, Request, Response } from "express";
import { PlatformRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { verifyPlatformAccessToken } from "../utils/platformJwt";

export interface PlatformAuthContext {
  platformAdminId: string;
  role: PlatformRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Deliberately separate from req.auth (tenant sessions) so a
      // platform-admin id can never be mistaken for a tenant User.id FK.
      platformAuth?: PlatformAuthContext;
    }
  }
}

export function authenticatePlatform(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyPlatformAccessToken(token);
    req.platformAuth = { platformAdminId: payload.sub, role: payload.role };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}

export function authorizePlatform(...roles: PlatformRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.platformAuth) {
      throw ApiError.unauthorized();
    }
    if (roles.length > 0 && !roles.includes(req.platformAuth.role)) {
      throw ApiError.forbidden("You do not have permission to perform this action");
    }
    next();
  };
}
