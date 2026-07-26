import { z } from "zod";

export const createSchoolGroupSchema = z.object({
  name: z.string().min(2).max(120),
});

export const updateSchoolGroupSchema = z.object({
  name: z.string().min(2).max(120),
});

export const assignTenantSchema = z.object({
  tenantId: z.string().min(1),
});

export type CreateSchoolGroupInput = z.infer<typeof createSchoolGroupSchema>;
export type UpdateSchoolGroupInput = z.infer<typeof updateSchoolGroupSchema>;
export type AssignTenantInput = z.infer<typeof assignTenantSchema>;
