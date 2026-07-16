import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthContext {
  userId: string;
  tenantId: string | null;
  role: UserRole;
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
    req.auth = { userId: payload.sub, tenantId: payload.tenantId, role: payload.role };
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
 * Regular users are locked to their own tenant. A SUPER_ADMIN may act on
 * behalf of a specific tenant via the `x-tenant-id` header. */
export function resolveTenantId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  if (req.auth.role === "SUPER_ADMIN") {
    const header = req.headers["x-tenant-id"];
    const tenantId = Array.isArray(header) ? header[0] : header;
    if (!tenantId) throw ApiError.badRequest("x-tenant-id header is required for platform admins");
    return tenantId;
  }
  if (!req.auth.tenantId) throw ApiError.forbidden("Account is not attached to a school");
  return req.auth.tenantId;
}
