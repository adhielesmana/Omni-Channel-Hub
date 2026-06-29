import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import Settings from "@/pages/settings";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import DataDeletion from "@/pages/data-deletion";
import VideoTemplate from "./components/video/VideoTemplate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Component /> : <Redirect to="/login" />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/video" component={VideoTemplate} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/data-deletion" component={DataDeletion} />

      <Route>
        <AppLayout>
          <Switch>
            <Route path="/inbox" component={() => <PrivateRoute component={Inbox} />} />
            <Route path="/contacts" component={() => <PrivateRoute component={Contacts} />} />
            <Route path="/departments" component={() => <PrivateRoute component={Departments} />} />
            <Route path="/channels" component={() => <PrivateRoute component={Channels} />} />
            <Route path="/users" component={() => <PrivateRoute component={Users} />} />
            <Route path="/analytics" component={() => <PrivateRoute component={Analytics} />} />
            <Route path="/settings" component={() => <PrivateRoute component={Settings} />} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
