import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as inventoryController from "./inventory.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "ACCOUNTANT");

router.get("/categories", staffRoles, inventoryController.listAssetCategories);
router.post(
  "/categories",
  staffRoles,
  auditLog("CREATE_ASSET_CATEGORY", "AssetCategory"),
  inventoryController.createAssetCategory
);

router.get("/assets", staffRoles, inventoryController.listAssets);
router.post("/assets", staffRoles, auditLog("CREATE_ASSET", "Asset"), inventoryController.createAsset);
router.patch("/assets/:assetId", staffRoles, auditLog("UPDATE_ASSET", "Asset"), inventoryController.updateAsset);
router.get("/assets/:assetId/maintenance", staffRoles, inventoryController.listMaintenanceLogs);
router.post(
  "/assets/:assetId/maintenance",
  staffRoles,
  auditLog("LOG_MAINTENANCE", "MaintenanceLog"),
  inventoryController.createMaintenanceLog
);

router.get("/supplies", staffRoles, inventoryController.listSupplies);
router.post("/supplies", staffRoles, auditLog("CREATE_SUPPLY", "Supply"), inventoryController.createSupply);
router.post(
  "/supplies/:supplyId/movements",
  staffRoles,
  auditLog("RECORD_SUPPLY_MOVEMENT", "SupplyMovement"),
  inventoryController.recordSupplyMovement
);

router.get("/procurement", staffRoles, inventoryController.listProcurementRequests);
router.post(
  "/procurement",
  staffRoles,
  auditLog("CREATE_PROCUREMENT_REQUEST", "ProcurementRequest"),
  inventoryController.createProcurementRequest
);
router.patch(
  "/procurement/:requestId",
  authorize("SCHOOL_ADMIN"),
  auditLog("REVIEW_PROCUREMENT_REQUEST", "ProcurementRequest"),
  inventoryController.reviewProcurementRequest
);

export default router;
