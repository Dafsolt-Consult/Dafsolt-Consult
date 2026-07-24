export type PlatformRole = "OWNER" | "SUPPORT";

export interface PlatformAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface PlatformTenantRow {
  id: string;
  name: string;
  slug: string;
  country: string;
  planTier: "FREE" | "BASIC" | "PREMIUM";
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  trialEndsAt: string | null;
  createdAt: string;
  _count: { students: number; users: number };
}

export interface PlatformTenantDetail extends PlatformTenantRow {
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
  maxStudents: number;
  maxStaff: number;
  subscriptionEndsAt: string | null;
}

export interface PlatformAuditLogEntry {
  id: string;
  tenantId: string | null;
  userId: string | null;
  platformAdminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
  platformAdmin?: { firstName: string; lastName: string; email: string } | null;
  tenant?: { name: string; slug: string } | null;
}

export interface ImpersonateResult {
  accessToken: string;
  expiresIn: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
}
