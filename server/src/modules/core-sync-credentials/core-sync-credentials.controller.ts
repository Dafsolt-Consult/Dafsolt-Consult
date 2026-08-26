import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { receiveSyncCredentialSchema } from "./core-sync-credentials.schema";
import * as coreSyncCredentialsService from "./core-sync-credentials.service";

// Unauthenticated at the guard layer by design — the caller is Core's
// backend, and the Authorization bearer (a Core-signed RS256
// "provisioning" JWT, verified against Core's JWKS inside the service)
// IS the authentication. Mounted in app.ts with its own JSON body limit
// and rate limiter; no CORS (server-to-server fetch, no browser).
export const receive = asyncHandler(async (req: Request, res: Response) => {
  const body = receiveSyncCredentialSchema.parse(req.body);
  await coreSyncCredentialsService.receiveSyncCredential(extractBearer(req), body);

  res.json({ stored: true });
});

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  return header.slice("Bearer ".length) || null;
}
