import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthContext {
  userId: string;
  tenantId: string | null;
  role: UserRole;
  // Set when this token was minted by a platform admin's impersonation
  // session (see modules/platform) rather than a real login — the value is
  // that platform admin's id, for audit-log propagation.
  impersonatedBy?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      impersonatedBy: payload.impersonatedBy,
    };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw ApiError.unauthorized();
    }
    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      throw ApiError.forbidden("You do not have permission to perform this action");
    }
    next();
  };
}

/** Resolves the tenantId a tenant-scoped request should operate under.
 * Every caller here is a real tenant User — including a platform admin
 * "acting as" one during an impersonation session (see modules/platform),
 * whose token carries a real tenantId just like a normal login. */
export function resolveTenantId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  if (!req.auth.tenantId) throw ApiError.forbidden("Account is not attached to a school");
  return req.auth.tenantId;
}
