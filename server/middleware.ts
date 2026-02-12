import type { Request, Response, NextFunction } from "express";
import type { UserRoleType, EmployeeGroupType } from "@shared/schema";
import type { UserWithRolesAndGroups } from "@shared/schema";

type ReqUser = UserWithRolesAndGroups | ({ role?: string | null; employeeGroup?: string | null } & { roles?: { code: string; name: string }[]; groups?: { code: string }[] });

function userHasRole(u: ReqUser, allowed: UserRoleType[]): boolean {
  const roles = (u as UserWithRolesAndGroups).roles;
  if (Array.isArray(roles) && roles.length) {
    return roles.some((r) => {
      const roleName = r.name as UserRoleType;
      if (allowed.includes(roleName)) {
        return true;
      }
      // Compare by code (case-insensitive)
      const roleCode = (r.code && typeof r.code === "string") ? r.code : String(r.code || "");
      return allowed.some((a) => {
        if (a == null) return false;
        const aStr = typeof a === "string" ? a : String(a);
        return aStr.toLowerCase() === roleCode.toLowerCase();
      });
    });
  }
  const leg = (u as { role?: string | null }).role;
  return !!leg && allowed.includes(leg as UserRoleType);
}

function userHasGroup(u: ReqUser, allowed: EmployeeGroupType[]): boolean {
  const groups = (u as UserWithRolesAndGroups).groups;
  if (Array.isArray(groups) && groups.length) {
    return groups.some((g) => allowed.includes(g.code as EmployeeGroupType));
  }
  const leg = (u as { employeeGroup?: string | null }).employeeGroup;
  return !!leg && allowed.includes(leg as EmployeeGroupType);
}

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
    if (!userHasRole(req.user as ReqUser, allowedRoles)) {
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
    if (!userHasGroup(req.user as ReqUser, allowedGroups)) {
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
    const u = req.user as ReqUser;
    const hasRole = roles.length === 0 || userHasRole(u, roles);
    const hasGroup = groups.length === 0 || userHasGroup(u, groups);
    if (hasRole || hasGroup) {
      next();
      return;
    }
    res.status(403).json({
      message: "Forbidden. Required: role " + roles.join("/") + " or group " + groups.join("/"),
    });
  };
}

/** Thiết lập header bảo mật cơ bản cho mọi response. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
}

/** Rate limit đơn giản theo IP cho một cửa sổ thời gian. */
export function rateLimit(options: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const { windowMs, max } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    next();
  };
}

/** Kiểm tra Origin/Referer cho phương thức ghi để giảm CSRF (tùy chọn). */
export function csrfOriginCheck(allowedOrigin: string) {
  const unsafe = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!unsafe.has(req.method)) return next();
    const origin = (req.headers.origin as string) || "";
    const referer = (req.headers.referer as string) || "";
    if (origin && origin !== allowedOrigin) {
      return res.status(403).json({ message: "Forbidden: invalid origin" });
    }
    if (referer && !referer.startsWith(allowedOrigin)) {
      return res.status(403).json({ message: "Forbidden: invalid referer" });
    }
    next();
  };
}
