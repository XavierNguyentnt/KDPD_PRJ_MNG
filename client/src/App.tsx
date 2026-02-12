import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/hooks/use-tasks";
import { I18nProvider } from "@/hooks/use-i18n";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import CVChungPage from "@/pages/cv-chung";
import BienTapPage from "@/pages/bien-tap";
import ThietKePage from "@/pages/thiet-ke";
import CNTTPage from "@/pages/cntt";
import Team from "@/pages/team";
import AdminPage from "@/pages/admin";
import AdminUsersPage from "@/pages/admin-users";
import ThuKyHopPhanPage from "@/pages/thu-ky-hop-phan";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function hasGroup(user: ReturnType<typeof useAuth>["user"], group: string) {
  const target = normalize(group);
  const list = user?.groups ?? [];
  return list.some((g) => {
    const name = normalize(g.name ?? "");
    const code = normalize(g.code ?? "");
    if (target === "thiếtkế" || target === "thietke") {
      return (
        name.includes("thiếtkế") ||
        code.includes("thietke") ||
        code.includes("thiet-k e") ||
        code.includes("thiet-ke")
      );
    }
    if (target === "cntt") {
      return name.includes("cntt") || code.includes("cntt");
    }
    if (target === "biêntập" || target === "bientap") {
      return (
        name.includes("biêntập") ||
        name.includes("bientap") ||
        code.includes("bientap") ||
        code.includes("bien-tap")
      );
    }
    return name.includes(target) || code.includes(target);
  });
}

function hasRoleOrGroup(
  user: ReturnType<typeof useAuth>["user"],
  roleCodes: string[],
  groupCodes: string[],
) {
  const roles = user?.roles ?? [];
  const groups = user?.groups ?? [];
  const hasRole = roles.some((r) =>
    roleCodes.includes(normalize(r.code ?? "")),
  );
  const hasGroup = groups.some((g) =>
    groupCodes.includes(normalize(g.code ?? "")),
  );
  return hasRole || hasGroup;
}

function GuardedGroupPage({
  group,
  Component,
}: {
  group: string;
  Component: React.ComponentType<any>;
}) {
  const { user, role } = useAuth();
  const [_, navigate] = useLocation();
  const isAdminManager = role === UserRole.ADMIN || role === UserRole.MANAGER;
  const allowed = isAdminManager || hasGroup(user, group);
  if (!allowed) {
    navigate("/");
    return null;
  }
  return <Component />;
}

function GuardedThietKePage() {
  const { user, role } = useAuth();
  const [_, navigate] = useLocation();
  const isAdminManager = role === UserRole.ADMIN || role === UserRole.MANAGER;
  const allowed =
    isAdminManager || hasRoleOrGroup(user, ["designer"], ["thiet_ke"]);
  if (!allowed) {
    navigate("/");
    return null;
  }
  return <ThietKePage />;
}

function GuardedCNTTPage() {
  const { user, role } = useAuth();
  const [_, navigate] = useLocation();
  const isAdminManager = role === UserRole.ADMIN || role === UserRole.MANAGER;
  const allowed = isAdminManager || hasRoleOrGroup(user, ["technical"], ["it"]);
  if (!allowed) {
    navigate("/");
    return null;
  }
  return <CNTTPage />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cv-chung" component={CVChungPage} />
        <Route
          path="/bien-tap"
          component={() => (
            <GuardedGroupPage group="Biên tập" Component={BienTapPage} />
          )}
        />
        <Route path="/thiet-ke" component={GuardedThietKePage} />
        <Route path="/cntt" component={GuardedCNTTPage} />
        <Route path="/tasks" component={Dashboard} /> {/* Legacy route */}
        <Route path="/team" component={Team} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/thu-ky-hop-phan" component={ThuKyHopPhanPage} />
        <Route path="/thu-ky-hop-phan/:sub" component={ThuKyHopPhanPage} />
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
