import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, UserRoleType } from "./use-tasks";

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  role?: string | null;
  employeeGroup?: string | null;
  isActive: boolean;
}

interface AuthContextType {
  user: ApiUser | null;
  loading: boolean;
  role: UserRoleType;
  setRole: (role: UserRoleType) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<UserRoleType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleRaw = simulatedRole ?? user?.role;
  const role: UserRoleType =
    roleRaw === UserRole.ADMIN || roleRaw === UserRole.MANAGER || roleRaw === UserRole.EMPLOYEE
      ? roleRaw
      : UserRole.EMPLOYEE;
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
    setUser(data as ApiUser);
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
