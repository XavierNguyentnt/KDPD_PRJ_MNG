import type { Request, Response, NextFunction } from "express";
import type { UserRoleType, EmployeeGroupType } from "@shared/schema";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized. Please log in." });
    return;
  }
  if (!req.user) {
    res.status(401).json({ message: "Session invalid. Please log in again." });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: UserRoleType[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }
    const role = (req.user as { role?: string | null }).role;
    if (!role || !allowedRoles.includes(role as UserRoleType)) {
      res.status(403).json({
        message: "Forbidden. Required role: " + allowedRoles.join(" or "),
        requiredRoles: allowedRoles,
      });
      return;
    }
    next();
  };
}

export function requireEmployeeGroup(...allowedGroups: EmployeeGroupType[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }
    const group = (req.user as { employeeGroup?: string | null }).employeeGroup;
    if (!group || !allowedGroups.includes(group as EmployeeGroupType)) {
      res.status(403).json({
        message: "Forbidden. Required employee group: " + allowedGroups.join(" or "),
        requiredGroups: allowedGroups,
      });
      return;
    }
    next();
  };
}

/** Require either one of the roles OR one of the employee groups (e.g. Admin/Manager OR bien_tap). */
export function requireRoleOrGroup(options: {
  roles?: UserRoleType[];
  groups?: EmployeeGroupType[];
}): (req: Request, res: Response, next: NextFunction) => void {
  const { roles = [], groups = [] } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }
    const u = req.user as { role?: string | null; employeeGroup?: string | null };
    const hasRole = roles.length === 0 || (u.role && roles.includes(u.role as UserRoleType));
    const hasGroup = groups.length === 0 || (u.employeeGroup && groups.includes(u.employeeGroup as EmployeeGroupType));
    if (hasRole || hasGroup) {
      next();
      return;
    }
    res.status(403).json({
      message: "Forbidden. Required: role " + roles.join("/") + " or group " + groups.join("/"),
    });
  };
}
