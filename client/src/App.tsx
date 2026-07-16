import { Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { OnboardPage } from "./pages/OnboardPage";
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
import { AvailableExamsPage } from "./pages/cbt/AvailableExamsPage";
import { ExamTakingPage } from "./pages/cbt/ExamTakingPage";
import { LibraryCatalogPage } from "./pages/library/LibraryCatalogPage";
import { BorrowRecordsPage } from "./pages/library/BorrowRecordsPage";
import { SchoolsPage } from "./pages/schools/SchoolsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboard" element={<OnboardPage />} />

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
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/cbt/questions" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><QuestionBankPage /></ProtectedRoute>} />
        <Route path="/cbt/exams" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><ExamsPage /></ProtectedRoute>} />
        <Route path="/cbt/exams/:examId" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "TEACHER"]}><ExamDetailPage /></ProtectedRoute>} />
        <Route path="/cbt/available" element={<ProtectedRoute roles={["STUDENT"]}><AvailableExamsPage /></ProtectedRoute>} />
        <Route path="/library/books" element={<LibraryCatalogPage />} />
        <Route path="/library/borrow-records" element={<ProtectedRoute roles={["SCHOOL_ADMIN", "LIBRARIAN"]}><BorrowRecordsPage /></ProtectedRoute>} />
        <Route path="/schools" element={<ProtectedRoute roles={["SUPER_ADMIN"]}><SchoolsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
