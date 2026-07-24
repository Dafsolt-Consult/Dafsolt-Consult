import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { usePlatformAuth } from "../context/PlatformAuthContext";
import { Spinner } from "../components/ui";
import { PlatformRole } from "../types/platform";

export function PlatformProtectedRoute({ children, roles }: { children: ReactNode; roles?: PlatformRole[] }) {
  const { admin, loading } = usePlatformAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!admin) return <Navigate to="/platform/login" replace />;
  if (roles && !roles.includes(admin.role)) return <Navigate to="/platform" replace />;

  return <>{children}</>;
}
