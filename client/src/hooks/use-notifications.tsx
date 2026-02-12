import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Notification } from "@shared/schema";

export function useNotifications(options?: { unreadOnly?: boolean; refetchInterval?: number }) {
  const unreadOnly = options?.unreadOnly ?? false;
  const refetchInterval = options?.refetchInterval ?? 15000;
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: async () => {
      const url = unreadOnly ? `${api.notifications.list.path}?unread=true` : api.notifications.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json() as Promise<Notification[]>;
    },
    refetchInterval,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await fetch(api.notifications.unreadCount.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch unread notification count");
      return res.json() as Promise<{ count: number }>;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.notifications.markRead.path, { id });
      const res = await fetch(url, {
        method: api.notifications.markRead.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json() as Promise<Notification>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
