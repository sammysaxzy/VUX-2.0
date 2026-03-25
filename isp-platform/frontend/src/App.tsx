import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DashboardPage } from "@/pages/dashboard-page";
import { FieldPage } from "@/pages/field-page";
import { RadiusPage } from "@/pages/radius-page";
import { SettingsPage } from "@/pages/settings-page";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { MapPage } from "@/pages/map-page";
import { CustomersPage } from "@/pages/customers-page";
import { CustomerProfilePage } from "@/pages/customer-profile-page";
import { InfrastructurePage } from "@/pages/infrastructure-page";
import { FaultsPage } from "@/pages/faults-page";

const ConfigurationMenuPage = lazy(() =>
  import("@/pages/configuration-menu-page").then((module) => ({ default: module.ConfigurationMenuPage })),
);
const ConfigDetailPage = lazy(() =>
  import("@/pages/config-detail-page").then((module) => ({ default: module.ConfigDetailPage })),
);

function ProtectedLayout() {
  const token = useAppStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;

  return (
    <WorkspaceShell>
      <Outlet />
    </WorkspaceShell>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore((state) => state.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="infrastructure" element={<InfrastructurePage />} />
        <Route path="faults" element={<FaultsPage />} />
        <Route path="field" element={<FieldPage />} />
        <Route path="radius" element={<RadiusPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="settings/configuration"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <ConfigurationMenuPage />
            </Suspense>
          }
        />
        <Route
          path="settings/configuration/:section"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <ConfigDetailPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
