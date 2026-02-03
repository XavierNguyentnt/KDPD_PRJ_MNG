import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, UserRoleType } from "./use-tasks";

/** (roleId, componentId) từ user_roles — dùng cho Thư ký hợp phần theo hợp phần. */
export interface RoleAssignmentItem {
  roleId: string;
  componentId: string | null;
}

/** User từ /api/auth/me (có thể có roles, groups, roleAssignments từ user_roles, user_groups). */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  isActive: boolean;
  roles?: { id: string; code: string; name: string }[];
  groups?: { id: string; code: string; name: string }[];
  /** Chi tiết (roleId, componentId) từ user_roles — dùng phân quyền Thư ký hợp phần theo hợp phần. */
  roleAssignments?: RoleAssignmentItem[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  role: UserRoleType;
  setRole: (role: UserRoleType) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function deriveRole(user: AuthUser | null): UserRoleType {
  const roles = user?.roles;
  if (Array.isArray(roles) && roles.length) {
    // Admin: code admin, name Admin hoặc Quản trị
    if (roles.some((r) => r.name === UserRole.ADMIN || r.code === "admin" || r.name === "Quản trị" || r.name === "Quản trị viên")) return UserRole.ADMIN;
    // Quản lý: code manager, name Manager, Quản lý, hoặc Trưởng/Phó ban (Trưởng ban Thư ký, ptbtk, tbtk...)
    if (roles.some((r) =>
      r.name === UserRole.MANAGER || r.code === "manager" || r.name === "Quản lý"
      || (r.name && (r.name.includes("Trưởng ban") || r.name.includes("Phó trưởng ban")))
      || (r.code && (r.code.replace(/\t/g, "").trim() === "tbtk" || r.code.replace(/\t/g, "").trim() === "ptbtk"))
    )) return UserRole.MANAGER;
  }
  return UserRole.EMPLOYEE;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<UserRoleType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const role: UserRoleType = simulatedRole ?? deriveRole(user);
  const setRole = setSimulatedRole;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (cancelled) return;
        setUser(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message ?? "Đăng nhập thất bại");
      throw new Error(data.message ?? "Đăng nhập thất bại");
    }
    setUser(data as AuthUser);
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setSimulatedRole(null);
  }

  const value: AuthContextType = {
    user,
    loading,
    role,
    setRole,
    login,
    logout,
    error,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
