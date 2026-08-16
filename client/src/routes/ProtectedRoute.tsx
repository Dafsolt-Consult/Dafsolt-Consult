import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui";
import { UserRole } from "../types";
import { ReactNode } from "react";
import { LandingPage } from "../pages/LandingPage";

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    // The root path is the public marketing site for a signed-out visitor —
    // everything else still bounces to /login.
    if (location.pathname === "/") return <LandingPage />;
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
