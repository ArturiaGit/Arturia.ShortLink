import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { LoginPage } from "@/pages/Auth/LoginPage";
import { RegisterPage } from "@/pages/Auth/RegisterPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { LinksPage } from "@/pages/Links/LinksPage";
import { AnalyticsPage } from "@/pages/Analytics/AnalyticsPage";
import { DomainsPage } from "@/pages/Domains/DomainsPage";
import { TeamPage } from "@/pages/Team/TeamPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { Toaster } from "@/components/ui/sonner";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            {/* 公开认证路由 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 受保护的主控制台路由 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="links" element={<LinksPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="domains" element={<DomainsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </WorkspaceProvider>
    </AuthProvider>
  );
};

export default App;
