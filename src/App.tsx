import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/presentation/layouts/AppLayout";
import DashboardPage from "@/presentation/pages/DashboardPage";
import CalendarPage from "@/presentation/pages/CalendarPage";
import WeeklyReportPage from "@/presentation/pages/WeeklyReportPage";
import PerformancePage from "@/presentation/pages/PerformancePage";
import LoadRecoveryPage from "@/presentation/pages/LoadRecoveryPage";
import WellnessPage from "@/presentation/pages/WellnessPage";
import DisciplinePage from "@/presentation/pages/DisciplinePage";
import SeasonGoalsPage from "@/presentation/pages/SeasonGoalsPage";
import SessionsPage from "@/presentation/pages/SessionsPage";
import UploadPage from "@/presentation/pages/UploadPage";
import EquipmentPage from "@/presentation/pages/EquipmentPage";
import EquipmentDetailPage from "@/presentation/pages/EquipmentDetailPage";
import SettingsPage from "@/presentation/pages/SettingsPage";
import AthleteProfilePage from "@/presentation/pages/AthleteProfilePage";
import RacePlanPage from "@/presentation/pages/RacePlanPage";
import ComparisonPage from "@/presentation/pages/ComparisonPage";
import TestBaselinesPage from "@/presentation/pages/TestBaselinesPage";
import UXTestPage from "@/presentation/pages/UXTestPage";
import SessionAnalysisPage from "@/presentation/pages/SessionAnalysisPage";
import AdminUsersPage from "@/presentation/pages/AdminUsersPage";
import AdminAssignmentsPage from "@/presentation/pages/AdminAssignmentsPage";
import AdminSystemSettingsPage from "@/presentation/pages/AdminSystemSettingsPage";
import CoachAssistantPage from "@/presentation/pages/CoachAssistantPage";
import CoachTriagePage from "@/presentation/pages/CoachTriagePage";
import LoginPage from "@/presentation/pages/LoginPage";
import DevLoginPage from "@/presentation/pages/DevLoginPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dev-login" element={<DevLoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/kalender" element={<CalendarPage />} />
        <Route path="/ugerapport" element={<WeeklyReportPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/load-restitution" element={<LoadRecoveryPage />} />
        <Route path="/wellness" element={<WellnessPage />} />
        <Route path="/sammenligning" element={<ComparisonPage />} />
        <Route path="/test-resultater" element={<TestBaselinesPage />} />
        <Route path="/disciplin/:sportKey" element={<DisciplinePage />} />
        <Route path="/saeson-maal" element={<SeasonGoalsPage />} />
        <Route path="/raceplan" element={<RacePlanPage />} />
        <Route path="/sessioner" element={<SessionsPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/udstyr/:id" element={<EquipmentDetailPage />} />
        <Route path="/udstyr" element={<EquipmentPage />} />
        <Route path="/indstillinger/atletprofil" element={<AthleteProfilePage />} />
        <Route path="/indstillinger" element={<SettingsPage />} />
        <Route path="/ux-test" element={<UXTestPage />} />
        <Route path="/sessions/:sessionId" element={<SessionAnalysisPage />} />
        <Route path="/admin/brugere" element={<AdminUsersPage />} />
        <Route path="/admin/tilknytninger" element={<AdminAssignmentsPage />} />
        <Route path="/admin/indstillinger" element={<AdminSystemSettingsPage />} />
        <Route path="/coach-assistent" element={<CoachAssistantPage />} />
        <Route path="/coach-triage" element={<CoachTriagePage />} />
      </Route>
    </Routes>
  );
}
