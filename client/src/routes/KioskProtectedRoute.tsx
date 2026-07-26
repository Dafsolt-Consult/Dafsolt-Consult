import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { kioskTokenStore } from "../api/kioskClient";

// Simpler than PlatformProtectedRoute/ProtectedRoute: the kiosk token IS the
// session (no "me" endpoint, no profile fetch, no async loading state) —
// presence of the token is all there is to check.
export function KioskProtectedRoute({ children }: { children: ReactNode }) {
  if (!kioskTokenStore.getAccessToken()) return <Navigate to="/kiosk/login" replace />;
  return <>{children}</>;
}
