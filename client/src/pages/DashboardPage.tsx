import { useAuth } from "../context/AuthContext";
import { Card, PageHeader } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { Paginated, Student } from "../types";
import { Link } from "react-router-dom";
import { ParentPage } from "./parent/ParentPage";

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "PARENT") return <ParentPage />;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.firstName}`} subtitle={user.tenant ? `${user.tenant.name} · ${user.role.replace("_", " ")}` : undefined} />
      {user.role === "SCHOOL_ADMIN" && <AdminOverview />}
      {user.role === "TEACHER" && <TeacherOverview />}
      {user.role === "STUDENT" && <StudentOverview />}
      {user.role === "NURSE" && <NurseOverview />}
      {user.role === "HR_MANAGER" && <HRManagerOverview />}
      {user.role === "TRANSPORT_OFFICER" && <TransportOfficerOverview />}
      {user.role === "HOSTEL_WARDEN" && <HostelWardenOverview />}
      {(user.role === "LIBRARIAN" || user.role === "ACCOUNTANT") && (
        <Card>
          <p className="text-sm text-slate-600">Use the sidebar to navigate to your tools.</p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const content = (
    <Card className="hover:border-brand-300">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function AdminOverview() {
  const { data: students } = useFetch<Paginated<Student>>("/students?pageSize=1");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Students" value={students?.total ?? "—"} to="/students" />
      <StatCard label="Teachers" value="View" to="/teachers" />
      <StatCard label="Question Bank" value="Manage" to="/cbt/questions" />
      <StatCard label="Library" value="Browse" to="/library/books" />
      <StatCard label="Assignments" value="Manage" to="/assignments" />
      <StatCard label="Calendar" value="Manage" to="/calendar" />
      <StatCard label="Announcements" value="Post" to="/announcements" />
    </div>
  );
}

function TeacherOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Mark attendance" value="Go" to="/attendance" />
      <StatCard label="Enter results" value="Go" to="/results" />
      <StatCard label="Exams" value="Manage" to="/cbt/exams" />
      <StatCard label="Assignments" value="Manage" to="/assignments" />
    </div>
  );
}

function StudentOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="My exams" value="View" to="/cbt/available" />
      <StatCard label="My assignments" value="View" to="/assignments" />
      <StatCard label="My results" value="View" to="/results" />
      <StatCard label="Library" value="Browse" to="/library/books" />
    </div>
  );
}

function NurseOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Health Records" value="Manage" to="/health-records" />
      <StatCard label="HR & Payroll" value="Go" to="/hr" />
    </div>
  );
}

function HRManagerOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="HR & Payroll" value="Manage" to="/hr" />
    </div>
  );
}

function TransportOfficerOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Transport" value="Manage" to="/transport" />
      <StatCard label="HR & Payroll" value="Go" to="/hr" />
    </div>
  );
}

function HostelWardenOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Hostel" value="Manage" to="/hostel" />
      <StatCard label="HR & Payroll" value="Go" to="/hr" />
    </div>
  );
}
