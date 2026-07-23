import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditLog } from "../../middleware/audit";
import * as hrController from "./hr.controller";

const router = Router();
router.use(authenticate);

const hrRoles = authorize("SCHOOL_ADMIN", "HR_MANAGER");
const anyStaff = authorize(
  "SCHOOL_ADMIN",
  "HR_MANAGER",
  "TEACHER",
  "LIBRARIAN",
  "ACCOUNTANT",
  "NURSE",
  "TRANSPORT_OFFICER",
  "HOSTEL_WARDEN"
);

router.get("/attendance", hrRoles, hrController.listStaffAttendance);
router.post("/attendance", hrRoles, auditLog("MARK_STAFF_ATTENDANCE", "StaffAttendance"), hrController.markStaffAttendance);

router.get("/leave-requests", anyStaff, hrController.listLeaveRequests);
router.post(
  "/leave-requests",
  anyStaff,
  auditLog("CREATE_LEAVE_REQUEST", "LeaveRequest"),
  hrController.createLeaveRequest
);
router.patch(
  "/leave-requests/:requestId",
  hrRoles,
  auditLog("REVIEW_LEAVE_REQUEST", "LeaveRequest"),
  hrController.reviewLeaveRequest
);

router.get("/payroll/runs", hrRoles, hrController.listPayrollRuns);
router.post("/payroll/runs", hrRoles, auditLog("CREATE_PAYROLL_RUN", "PayrollRun"), hrController.createPayrollRun);
router.post(
  "/payroll/runs/:runId/finalize",
  hrRoles,
  auditLog("FINALIZE_PAYROLL_RUN", "PayrollRun"),
  hrController.finalizePayrollRun
);
router.get("/payroll/runs/:runId/payslips", hrRoles, hrController.listPayslips);
router.post(
  "/payroll/runs/:runId/payslips",
  hrRoles,
  auditLog("UPSERT_PAYSLIP", "Payslip"),
  hrController.upsertPayslip
);
router.post(
  "/payroll/payslips/:payslipId/pay",
  hrRoles,
  auditLog("MARK_PAYSLIP_PAID", "Payslip"),
  hrController.markPayslipPaid
);
router.get("/payroll/my-payslips", anyStaff, hrController.listMyPayslips);

router.get("/performance-reviews", anyStaff, hrController.listPerformanceReviews);
router.post(
  "/performance-reviews",
  hrRoles,
  auditLog("CREATE_PERFORMANCE_REVIEW", "PerformanceReview"),
  hrController.createPerformanceReview
);

export default router;
