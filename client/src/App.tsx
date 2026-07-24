import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Spinner } from "./components/ui";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardPage } from "./pages/OnboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AppLayout } from "./layout/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { StudentsPage } from "./pages/students/StudentsPage";
import { TeachersPage } from "./pages/teachers/TeachersPage";
import { AcademicsPage } from "./pages/academics/AcademicsPage";
import { AttendancePage } from "./pages/attendance/AttendancePage";
import { ResultsPage } from "./pages/results/ResultsPage";
import { FeesPage } from "./pages/fees/FeesPage";
import { QuestionBankPage } from "./pages/cbt/QuestionBankPage";
import { ExamsPage } from "./pages/cbt/ExamsPage";
import { ExamDetailPage } from "./pages/cbt/ExamDetailPage";
import { GradingPage } from "./pages/cbt/GradingPage";
import { AvailableExamsPage } from "./pages/cbt/AvailableExamsPage";
import { ExamTakingPage } from "./pages/cbt/ExamTakingPage";
import { LibraryCatalogPage } from "./pages/library/LibraryCatalogPage";
import { BorrowRecordsPage } from "./pages/library/BorrowRecordsPage";
import { AssignmentsPage } from "./pages/assignments/AssignmentsPage";
import { LessonPlansPage } from "./pages/lesson-plans/LessonPlansPage";
import { TimetablePage } from "./pages/timetable/TimetablePage";
import { ComplianceReportsPage } from "./pages/compliance/ComplianceReportsPage";

import { TransportPage } from "./pages/transport/TransportPage";
import { HostelPage } from "./pages/hostel/HostelPage";
import { HRPage } from "./pages/hr/HRPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";

// Code-split: recharts is a heavy dependency only SCHOOL_ADMIN ever loads.
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
import { CalendarPage } from "./pages/calendar/CalendarPage";
import { AnnouncementsPage } from "./pages/announcements/AnnouncementsPage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";

import { PlatformAuthProvider } from "./context/PlatformAuthContext";
import { PlatformProtectedRoute } from "./routes/PlatformProtectedRoute";
import { PlatformLayout } from "./layout/PlatformLayout";
import { PlatformLoginPage } from "./pages/platform/PlatformLoginPage";
import { PlatformDashboardPage } from "./pages/platform/PlatformDashboardPage";
import { PlatformSchoolsPage } from "./pages/platform/PlatformSchoolsPage";
import { PlatformSchoolDetailPage } from "./pages/platform/PlatformSchoolDetailPage";
import { PlatformAdminsPage } from "./pages/platform/PlatformAdminsPage";
import { PlatformAuditLogPage } from "./pages/platform/PlatformAuditLogPage";
import { PlatformGlobalQuestionsPage } from "./pages/platform/PlatformGlobalQuestionsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboard" element={<OnboardPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/platform/*"
        element={
          <PlatformAuthProvider>
            <Routes>
              <Route path="login" element={<PlatformLoginPage />} />
              <Route
                element={
                  <PlatformProtectedRoute>
                    <PlatformLayout />
                  </PlatformProtectedRoute>
                }
              >
                <Route index element={<PlatformDashboardPage />} />
                <Route path="schools" element={<PlatformSchoolsPage />} />
                <Route path="schools/:tenantId" element={<PlatformSchoolDetailPage />} />
                <Route
                  path="admins"
                  element={
                    <PlatformProtectedRoute roles={["OWNER"]}>
                      <PlatformAdminsPage />
                    </PlatformProtectedRoute>
                  }
                />
                <Route path="audit-log" element={<PlatformAuditLogPage />} />
                <Route path="global-questions" element={<PlatformGlobalQuestionsPage />} />
              </Route>
            </Routes>
          </PlatformAuthProvider>
        }
      />

      <Route
        path="/cbt/attempts/:attemptId"
        element={
          <ProtectedRoute roles={["STUDENT"]}>
            <div className="min-h-screen bg-slate-50 p-6">
              <ExamTakingPage />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><StudentsPage /></ProtectedRoute>} />
        <Route path="/teachers" element={<ProtectedRoute roles={["SCHOOL_ADMIN"]}><TeachersPage /></ProtectedRoute>} />
        <Route path="/academics" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><AcademicsPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><AttendancePage /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"]}><ResultsPage /></ProtectedRoute>} />
        <Route path="/fees" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"]}><FeesPage /></ProtectedRoute>} />
        <Route path="/cbt/questions" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><QuestionBankPage /></ProtectedRoute>} />
        <Route path="/cbt/exams" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><ExamsPage /></ProtectedRoute>} />
        <Route path="/cbt/exams/:examId" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><ExamDetailPage /></ProtectedRoute>} />
        <Route path="/cbt/exams/:examId/attempts/:attemptId/grade" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><GradingPage /></ProtectedRoute>} />
        <Route path="/cbt/available" element={<ProtectedRoute roles={["STUDENT"]}><AvailableExamsPage /></ProtectedRoute>} />
        <Route path="/library/books" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "LIBRARIAN", "TEACHER", "STUDENT", "PARENT"]}><LibraryCatalogPage /></ProtectedRoute>} />
        <Route path="/library/borrow-records" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "LIBRARIAN"]}><BorrowRecordsPage /></ProtectedRoute>} />
        <Route path="/assignments" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER", "STUDENT"]}><AssignmentsPage /></ProtectedRoute>} />
        <Route path="/lesson-plans" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><LessonPlansPage /></ProtectedRoute>} />
        <Route path="/timetable" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER", "STUDENT"]}><TimetablePage /></ProtectedRoute>} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<ProtectedRoute roles={["SCHOOL_ADMIN"]}><SettingsPage /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute roles={["SCHOOL_ADMIN"]}><ComplianceReportsPage /></ProtectedRoute>} />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute roles={["SCHOOL_ADMIN"]}>
              <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
                <AnalyticsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transport"
          element={
            <ProtectedRoute roles={["SCHOOL_ADMIN", "TRANSPORT_OFFICER", "STUDENT", "PARENT"]}>
              <TransportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hostel"
          element={
            <ProtectedRoute roles={["SCHOOL_ADMIN", "HOSTEL_WARDEN", "STUDENT", "PARENT"]}>
              <HostelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr"
          element={
            <ProtectedRoute
              roles={["SCHOOL_ADMIN", "HR_MANAGER", "TEACHER", "LIBRARIAN", "ACCOUNTANT", "NURSE", "TRANSPORT_OFFICER", "HOSTEL_WARDEN"]}
            >
              <HRPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute roles={["SCHOOL_ADMIN", "ACCOUNTANT"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
