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
  planTier: "STARTER" | "GROWTH" | "PROFESSIONAL" | "ENTERPRISE" | "SCHOOL_GROUP";
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  trialEndsAt: string | null;
  createdAt: string;
  groupId: string | null;
  _count: { students: number; users: number };
}

export interface SchoolGroupRow {
  id: string;
  name: string;
  createdAt: string;
  _count: { tenants: number };
}

export interface SchoolGroupTenantSummary {
  id: string;
  name: string;
  slug: string;
  planTier: "STARTER" | "GROWTH" | "PROFESSIONAL" | "ENTERPRISE" | "SCHOOL_GROUP";
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  _count: { students: number; users: number };
}

export interface SchoolGroupDetail {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tenants: SchoolGroupTenantSummary[];
}

export interface SchoolGroupCampusReport {
  tenantId: string;
  tenantName: string;
  latestEnrollment: number;
  averageAttendanceRate: number;
  feeBilled: number;
  feePaid: number;
  feeCollectionRate: number;
  examPerformance: { examTitle: string; attempts: number; averageScore: number; passRate: number }[];
}

export interface SchoolGroupReport {
  group: { id: string; name: string };
  campuses: SchoolGroupCampusReport[];
  totals: {
    totalEnrollment: number;
    averageAttendanceRate: number;
    totalFeeBilled: number;
    totalFeePaid: number;
    feeCollectionRate: number;
  };
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
