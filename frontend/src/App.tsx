import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { LinksPage } from "@/pages/Links/LinksPage";
import { AnalyticsPage } from "@/pages/Analytics/AnalyticsPage";
import { DomainsPage } from "@/pages/Domains/DomainsPage";
import { TeamPage } from "@/pages/Team/TeamPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { Toaster } from "@/components/ui/sonner";

export const App: React.FC = () => {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
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
  );
};

export default App;
