import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Farmers from "@/pages/Farmers";
import Ledger from "@/pages/Ledger";
import Inventory from "@/pages/Inventory";
import ProfitLoss from "@/pages/ProfitLoss";
import Reports from "@/pages/Reports";
import AdminPanel from "@/pages/AdminPanel";
import Settings from "@/pages/Settings";
import Seasons from "@/pages/Seasons";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import OAuthConsent from "@/pages/OAuthConsent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, isPasswordRecovery } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (isPasswordRecovery) return <Navigate to="/reset-password" replace />;
  if (!session) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, isPasswordRecovery } = useAuth();
  if (loading) return null;
  if (session && isPasswordRecovery) return <Navigate to="/reset-password" replace />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RECOVERY_FLAG = "pw_recovery_active";

const RecoveryRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hash = window.location.hash || "";
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const type = params.get("type") || hashParams.get("type");
    const hasCode = params.has("code");
    const hasAccessToken = hashParams.has("access_token");
    const isRecovery = type === "recovery";

    // Any URL that looks like the recovery landing → lock into /reset-password
    if (isRecovery || (hasCode && location.pathname === "/reset-password") || (hasAccessToken && type === "recovery")) {
      try { sessionStorage.setItem(RECOVERY_FLAG, "1"); } catch {}
      if (location.pathname !== "/reset-password") {
        navigate(`/reset-password${location.search}${hash}`, { replace: true });
      }
    }
  }, [location, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RecoveryRedirect />
        <AuthProvider>
          <LanguageProvider>
          <SeasonProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/seasons" element={<ProtectedRoute><Seasons /></ProtectedRoute>} />
            <Route path="/farmers" element={<ProtectedRoute><Farmers /></ProtectedRoute>} />
            <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SeasonProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
