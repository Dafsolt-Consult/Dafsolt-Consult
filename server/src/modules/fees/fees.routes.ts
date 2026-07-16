import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as feesController from "./fees.controller";

const router = Router();
router.use(authenticate);

const staffRoles = authorize("SCHOOL_ADMIN", "ACCOUNTANT");

router.get("/structures", staffRoles, feesController.listFeeStructures);
router.post("/structures", staffRoles, feesController.createFeeStructure);
router.post("/invoices/generate", staffRoles, feesController.generateInvoices);
router.get("/invoices", authorize("SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"), feesController.listInvoices);
router.post("/payments", staffRoles, feesController.recordPayment);

export default router;
