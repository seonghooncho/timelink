import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainPage from "./pages/MainPage";
import CalendarPage from "./pages/CalendarPage";
import ScheduleFormPage from "./pages/ScheduleFormPage";
import GroupsPage from "./pages/GroupsPage";
import GroupFormPage from "./pages/GroupFormPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupJoinPage from "./pages/GroupJoinPage";
import TimeCoordinationPage from "./pages/TimeCoordinationPage";
import CoordinationTimetablePage from "./pages/CoordinationTimetablePage";
import MyPage from "./pages/MyPage";
import LoginPage from "./pages/LoginPage";
import NotificationsPage from "./pages/NotificationsPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Sonner />
          <PwaInstallPrompt />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/schedule/new" element={<ProtectedRoute><ScheduleFormPage /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
              <Route path="/groups/join/:inviteCode" element={<ProtectedRoute><GroupJoinPage /></ProtectedRoute>} />
              <Route path="/groups/new" element={<ProtectedRoute><GroupFormPage /></ProtectedRoute>} />
              <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
              <Route path="/groups/:id/coordination" element={<ProtectedRoute><TimeCoordinationPage /></ProtectedRoute>} />
              <Route path="/groups/:id/coordination/:coordId/timetable" element={<ProtectedRoute><CoordinationTimetablePage /></ProtectedRoute>} />
              <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
