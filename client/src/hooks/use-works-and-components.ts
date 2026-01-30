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
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}
