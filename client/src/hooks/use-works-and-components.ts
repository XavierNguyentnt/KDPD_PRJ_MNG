import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Work } from "@shared/schema";
import type { Component } from "@shared/schema";
import type { User } from "@shared/schema";

export function useWorks() {
  return useQuery({
    queryKey: ["works"],
    queryFn: async (): Promise<Work[]> => {
      const res = await fetch(api.works.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch works");
      return api.works.list.responses[200].parse(await res.json());
    },
  });
}

export function useComponents() {
  return useQuery({
    queryKey: ["components"],
    queryFn: async (): Promise<Component[]> => {
      const res = await fetch(api.components.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch components");
      return api.components.list.responses[200].parse(await res.json());
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async (): Promise<User[]> => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (res.status === 503) return [];
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useTaskFilterStaffUsers() {
  return useQuery({
    queryKey: [api.users.listTaskFilterStaff.path],
    queryFn: async (): Promise<User[]> => {
      const res = await fetch(api.users.listTaskFilterStaff.path, {
        credentials: "include",
      });
      if (res.status === 503) return [];
      if (!res.ok) throw new Error("Failed to fetch task-filter staff users");
      const list = api.users.listTaskFilterStaff.responses[200].parse(
        await res.json(),
      );
      return list.filter((u) => {
        const isActive = Boolean((u as any).isActive);
        const roles = Array.isArray((u as any).roles) ? (u as any).roles : [];
        const isPartner = roles.some(
          (r: any) =>
            (r && typeof r.code === "string" && r.code.toLowerCase() === "partner") ||
            (r &&
              typeof r.name === "string" &&
              r.name
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/\s+/g, "")
                .includes("doitac")),
        );
        const norm = (s: string) =>
          s
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .trim();
        const hasThuKyHopPhanRole = roles.some(
          (r: any) =>
            (r &&
              typeof r.code === "string" &&
              String(r.code).toLowerCase() === "prj_secretary") ||
            (r && typeof r.name === "string" && norm(r.name) === norm("Thư ký hợp phần")),
        );
        return isActive && !isPartner && hasThuKyHopPhanRole;
      });
    },
  });
}
