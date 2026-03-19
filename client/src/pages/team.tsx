import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTasks } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-works-and-components";
import { useI18n } from "@/hooks/use-i18n";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@shared/routes";

function normalizeDisplayName(s: string) {
  return s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export default function Team() {
  const { language } = useI18n();
  const { data: tasks, isLoading } = useTasks();
  const { data: users } = useUsers();

  const userByNormalizedName = useMemo(() => {
    const map = new Map<
      string,
      { id: string; avatarPath: string | null; updatedAt: unknown }
    >();
    for (const u of (users ?? []) as any[]) {
      const id = typeof u?.id === "string" ? u.id : "";
      const displayName =
        typeof u?.displayName === "string" ? u.displayName : "";
      const key = normalizeDisplayName(displayName);
      if (!id || !key) continue;
      map.set(key, {
        id,
        avatarPath:
          typeof u?.avatarPath === "string" && u.avatarPath.trim()
            ? u.avatarPath
            : null,
        updatedAt: u?.updatedAt,
      });
    }
    return map;
  }, [users]);

  const teamStats = useMemo(() => {
    if (!tasks) return [];

    const userGroupByName = new Map<string, string>();
    for (const u of (users ?? []) as any[]) {
      const name = typeof u?.displayName === "string" ? u.displayName : "";
      const key = normalizeDisplayName(name);
      if (!key) continue;
      const groups = Array.isArray(u?.groups) ? u.groups : [];
      const groupNames = groups
        .map((g: any) => (typeof g?.name === "string" ? g.name : ""))
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (groupNames.length > 0)
        userGroupByName.set(key, groupNames.join(", "));
    }

    const UNASSIGNED_KEY = "__unassigned__";

    const stats: Record<
      string,
      {
        name: string;
        teamLabel: string;
        total: number;
        completed: number;
        active: number;
      }
    > = {};

    const getAssigneeNames = (task: any): string[] => {
      const assignments = Array.isArray(task?.assignments)
        ? task.assignments
        : null;
      if (assignments && assignments.length > 0) {
        const list = assignments
          .map((a: any) =>
            typeof a?.displayName === "string" ? a.displayName : "",
          )
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (list.length > 0) return Array.from(new Set(list));
      }
      const raw = typeof task?.assignee === "string" ? task.assignee : "";
      const parts = raw
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      return parts.length > 0 ? Array.from(new Set(parts)) : [];
    };

    const isCompleted = (task: any) =>
      String(task?.status || "") === "Completed" ||
      task?.actualCompletedAt != null;

    for (const task of tasks as any[]) {
      const assignees = getAssigneeNames(task);
      const completed = isCompleted(task);

      if (assignees.length === 0) {
        const k = UNASSIGNED_KEY;
        if (!stats[k]) {
          stats[k] = {
            name: language === "vi" ? "Chưa giao" : "Unassigned",
            teamLabel: language === "vi" ? "Kho công việc" : "Task pool",
            total: 0,
            completed: 0,
            active: 0,
          };
        }
        stats[k].total += 1;
        if (completed) stats[k].completed += 1;
        else stats[k].active += 1;
        continue;
      }

      for (const name of assignees) {
        const k = normalizeDisplayName(name);
        if (!stats[k]) {
          const grp = userGroupByName.get(k) ?? "";
          stats[k] = {
            name,
            teamLabel:
              grp || (language === "vi" ? "Chưa phân nhóm" : "No group"),
            total: 0,
            completed: 0,
            active: 0,
          };
        }
        stats[k].total += 1;
        if (completed) stats[k].completed += 1;
        else stats[k].active += 1;
      }
    }

    const list = Object.values(stats);
    list.sort((a, b) => {
      const au =
        a.name === (language === "vi" ? "Chưa giao" : "Unassigned") ? 1 : 0;
      const bu =
        b.name === (language === "vi" ? "Chưa giao" : "Unassigned") ? 1 : 0;
      if (au !== bu) return au - bu;
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, "vi");
    });
    return list;
  }, [tasks, users, language]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {language === "vi" ? "Hiệu suất nhóm" : "Team performance"}
        </h2>
        <p className="text-muted-foreground">
          {language === "vi"
            ? "Tổng quan phân bổ công việc và tỷ lệ hoàn thành."
            : "Overview of task distribution and completion rates."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamStats.map((member) => (
          <Card key={member.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              {(() => {
                const key = normalizeDisplayName(member.name);
                const u = userByNormalizedName.get(key);
                const avatarSrc =
                  u?.id && u?.avatarPath
                    ? `${api.users.avatar.path.replace(":id", u.id)}?v=${encodeURIComponent(String(u.updatedAt ?? ""))}`
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`;
                return (
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
                );
              })()}
              <div className="flex flex-col">
                <CardTitle className="text-base font-semibold">
                  {member.name}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {member.teamLabel}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                  <span className="text-xl font-bold font-display">
                    {member.total}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    {language === "vi" ? "Tổng" : "Total"}
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-green-50 rounded-lg text-green-700">
                  <span className="text-xl font-bold font-display">
                    {member.completed}
                  </span>
                  <span className="text-[10px] uppercase font-medium opacity-80">
                    {language === "vi" ? "Hoàn thành" : "Done"}
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-blue-50 rounded-lg text-blue-700">
                  <span className="text-xl font-bold font-display">
                    {member.active}
                  </span>
                  <span className="text-[10px] uppercase font-medium opacity-80">
                    {language === "vi" ? "Đang làm" : "Active"}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">
                    {language === "vi" ? "Hiệu suất" : "Efficiency"}
                  </span>
                  <span className="font-medium">
                    {member.total > 0
                      ? Math.round((member.completed / member.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: `${member.total > 0 ? (member.completed / member.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
