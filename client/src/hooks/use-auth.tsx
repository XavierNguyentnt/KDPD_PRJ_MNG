import { createContext, useContext, useState, ReactNode } from "react";
import { UserRole, UserRoleType } from "./use-tasks";

interface AuthContextType {
  role: UserRoleType;
  setRole: (role: UserRoleType) => void;
  user: { name: string; department: string }; // Mock user data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRoleType>(UserRole.ADMIN);

  // Mock user data based on role
  const user = {
    name: role === UserRole.EMPLOYEE ? "Alice Smith" : "John Doe",
    department: "Development",
  };

  return (
    <AuthContext.Provider value={{ role, setRole, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
