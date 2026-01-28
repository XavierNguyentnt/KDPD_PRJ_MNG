import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { I18nProvider } from "@/hooks/use-i18n";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import CVChungPage from "@/pages/cv-chung";
import BienTapPage from "@/pages/bien-tap";
import ThietKeCNTTPage from "@/pages/thiet-ke-cntt";
import Team from "@/pages/team";
import AdminPage from "@/pages/admin";
import AdminUsersPage from "@/pages/admin-users";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cv-chung" component={CVChungPage} />
        <Route path="/bien-tap" component={BienTapPage} />
        <Route path="/thiet-ke-cntt" component={ThietKeCNTTPage} />
        <Route path="/tasks" component={Dashboard} /> {/* Legacy route */}
        <Route path="/team" component={Team} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }
  if (!user) {
    return <LoginPage />;
  }
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGate />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
