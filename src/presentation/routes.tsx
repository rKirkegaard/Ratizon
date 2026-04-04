import { RouteObject } from "react-router-dom";
import AppLayout from "@/presentation/layouts/AppLayout";
import DashboardPage from "@/presentation/pages/DashboardPage";
import CalendarPage from "@/presentation/pages/CalendarPage";
import WeeklyReportPage from "@/presentation/pages/WeeklyReportPage";
import PerformancePage from "@/presentation/pages/PerformancePage";
import LoadRecoveryPage from "@/presentation/pages/LoadRecoveryPage";
import WellnessPage from "@/presentation/pages/WellnessPage";
import RunningPage from "@/presentation/pages/RunningPage";
import CyclingPage from "@/presentation/pages/CyclingPage";
import SwimmingPage from "@/presentation/pages/SwimmingPage";
import SeasonGoalsPage from "@/presentation/pages/SeasonGoalsPage";
import SessionsPage from "@/presentation/pages/SessionsPage";
import UploadPage from "@/presentation/pages/UploadPage";
import EquipmentPage from "@/presentation/pages/EquipmentPage";
import SettingsPage from "@/presentation/pages/SettingsPage";
import LoginPage from "@/presentation/pages/LoginPage";
import { Navigate } from "react-router-dom";

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "kalender", element: <CalendarPage /> },
      { path: "ugerapport", element: <WeeklyReportPage /> },
      { path: "performance", element: <PerformancePage /> },
      { path: "load-restitution", element: <LoadRecoveryPage /> },
      { path: "wellness", element: <WellnessPage /> },
      { path: "loeb", element: <RunningPage /> },
      { path: "cykling", element: <CyclingPage /> },
      { path: "svoemning", element: <SwimmingPage /> },
      { path: "saeson-maal", element: <SeasonGoalsPage /> },
      { path: "sessioner", element: <SessionsPage /> },
      { path: "upload", element: <UploadPage /> },
      { path: "udstyr", element: <EquipmentPage /> },
      { path: "indstillinger", element: <SettingsPage /> },
    ],
  },
];
