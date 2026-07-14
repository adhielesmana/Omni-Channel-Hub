import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Inbox from "@/pages/inbox";
import Contacts from "@/pages/contacts";
import Departments from "@/pages/departments";
import Channels from "@/pages/channels";
import Users from "@/pages/users";
import Analytics from "@/pages/analytics";
import WhatsappBlasts from "@/pages/whatsapp-blasts";
import WhatsappTemplates from "@/pages/whatsapp-templates";
import ApiOutbox from "@/pages/api-outbox";
import AutoReplySettings from "@/pages/auto-reply";
import Settings from "@/pages/settings";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import DataDeletion from "@/pages/data-deletion";
import VideoTemplate from "./components/video/VideoTemplate";
import { canAccessAdminFeatures } from "@/lib/permissions";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  type AuthSessionExpiredDetail,
} from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (adminOnly && !canAccessAdminFeatures(user)) return <Redirect to="/inbox" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function AuthSessionListener() {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const handledRef = useRef(false);

  useEffect(() => {
    handledRef.current = false;

    const handleSessionExpired = (event: Event) => {
      const detail = (event as CustomEvent<AuthSessionExpiredDetail>).detail;
      if (!detail || detail.status !== 401 || handledRef.current || !token) {
        return;
      }

      handledRef.current = true;
      logout();
      queryClient.clear();
      toast({
        title: "Session expired",
        description: "Please sign in again to continue.",
      });
      navigate("/?reason=session-expired", { replace: true });
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [logout, navigate, queryClient, token]);

  return null;
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/inbox" /> : <Login />}
      </Route>
      <Route path="/video" component={VideoTemplate} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/data-deletion" component={DataDeletion} />

      {/* Protected app routes */}
      <Route path="/inbox">
        <ProtectedRoute component={Inbox} />
      </Route>
      <Route path="/contacts">
        <ProtectedRoute component={Contacts} />
      </Route>
      <Route path="/departments">
        <ProtectedRoute component={Departments} adminOnly />
      </Route>
      <Route path="/channels">
        <ProtectedRoute component={Channels} adminOnly />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={Users} adminOnly />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} />
      </Route>
      <Route path="/whatsapp-blasts">
        <ProtectedRoute component={WhatsappBlasts} />
      </Route>
      <Route path="/whatsapp-templates">
        <ProtectedRoute component={WhatsappTemplates} />
      </Route>
      <Route path="/api-outbox">
        <ProtectedRoute component={ApiOutbox} />
      </Route>
      <Route path="/auto-reply">
        <ProtectedRoute component={AutoReplySettings} adminOnly />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthSessionListener />
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
