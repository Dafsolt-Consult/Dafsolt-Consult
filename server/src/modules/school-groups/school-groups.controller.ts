import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as schoolGroupsService from "./school-groups.service";
import { assignTenantSchema, createSchoolGroupSchema, updateSchoolGroupSchema } from "./school-groups.schema";

export const listSchoolGroups = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await schoolGroupsService.listSchoolGroups());
});

export const createSchoolGroup = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchoolGroupSchema.parse(req.body);
  const group = await schoolGroupsService.createSchoolGroup(input);
  res.status(201).json(group);
});

export const getSchoolGroupById = asyncHandler(async (req: Request, res: Response) => {
  res.json(await schoolGroupsService.getSchoolGroupById(req.params.groupId));
});

export const updateSchoolGroup = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSchoolGroupSchema.parse(req.body);
  res.json(await schoolGroupsService.updateSchoolGroup(req.params.groupId, input));
});

export const assignTenantToGroup = asyncHandler(async (req: Request, res: Response) => {
  const input = assignTenantSchema.parse(req.body);
  res.json(await schoolGroupsService.assignTenantToGroup(req.params.groupId, input.tenantId));
});

export const removeTenantFromGroup = asyncHandler(async (req: Request, res: Response) => {
  res.json(await schoolGroupsService.removeTenantFromGroup(req.params.tenantId));
});

export const getGroupConsolidatedReport = asyncHandler(async (req: Request, res: Response) => {
  res.json(await schoolGroupsService.getGroupConsolidatedReport(req.params.groupId));
});
