import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-works-and-components";
import { useI18n } from "@/hooks/use-i18n";
import { useMemo, useState } from "react";
import { CardGridSkeleton } from "@/components/ui/skeletons";
import { api } from "@shared/routes";
import { useRefreshTasks } from "@/hooks/use-tasks";
import { GroupPageHero } from "@/components/group-page-hero";
import { MemberHeatmap12m } from "@/components/member-heatmap-12m";
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  Star,
  UsersRound,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function normalizeDisplayName(s: string) {
  return s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export default function Team() {
  const { language } = useI18n();
  const { data: tasks, isLoading } = useTasks();
  const { data: users } = useUsers();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();

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

    type MStat = {
      name: string;
      teamLabel: string;
      total: number;
      completed: number;
      active: number;
      overdue: number;
      monthlyCompleted: number[];
      assignedGroups: Set<string>;
      averageVote: number;
      votedTasks: number;
      recentTasks: {
        id: number | string;
        title: string;
        group: string;
        status: string;
        due: string | null;
        vote: number | null;
      }[];
    };

    const stats: Record<string, MStat> = {};

    const now = new Date();
    const thisYear = now.getFullYear();

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

    const parseDate = (v: unknown): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
      if (typeof v === "number") {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof v === "string") {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    const isOverdue = (task: any) => {
      if (isCompleted(task)) return false;
      const d = parseDate(task?.dueDate ?? task?.deadline);
      if (!d) return false;
      return d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    };

    for (const task of tasks as any[]) {
      const assignees = getAssigneeNames(task);
      const completed = isCompleted(task);
      const completedDate = parseDate(task?.actualCompletedAt ?? task?.completedAt);
      const taskMonth = completed && completedDate && completedDate.getFullYear() === thisYear
        ? completedDate.getMonth()
        : -1;
      const overdue = isOverdue(task);
      const groupName = typeof task?.group === "string" ? task.group : "";
      const voteRaw = task?.vote ?? task?.averageVote;
      const vote = typeof voteRaw === "number" && Number.isFinite(voteRaw) ? voteRaw : null;
      const taskTitle = typeof task?.title === "string" ? task.title : `#${task?.id ?? ""}`;
      const dueRaw = parseDate(task?.dueDate ?? task?.deadline);
      const dueStr = dueRaw ? dueRaw.toISOString().slice(0, 10) : null;
      const status = String(task?.status ?? "");

      if (assignees.length === 0) {
        const k = UNASSIGNED_KEY;
        if (!stats[k]) {
          stats[k] = {
            name: language === "vi" ? "Chưa giao" : "Unassigned",
            teamLabel: language === "vi" ? "Kho công việc" : "Task pool",
            total: 0,
            completed: 0,
            active: 0,
            overdue: 0,
            monthlyCompleted: new Array(12).fill(0),
            assignedGroups: new Set<string>(),
            averageVote: 0,
            votedTasks: 0,
            recentTasks: [],
          };
        }
        stats[k].total += 1;
        if (completed) {
          stats[k].completed += 1;
          if (taskMonth >= 0) stats[k].monthlyCompleted[taskMonth] += 1;
        } else if (overdue) stats[k].overdue += 1;
        else stats[k].active += 1;
        if (groupName) stats[k].assignedGroups.add(groupName);
        if (vote != null) {
          stats[k].averageVote += vote;
          stats[k].votedTasks += 1;
        }
        if (stats[k].recentTasks.length < 10) {
          stats[k].recentTasks.push({
            id: task?.id ?? "",
            title: taskTitle,
            group: groupName,
            status,
            due: dueStr,
            vote,
          });
        }
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
            overdue: 0,
            monthlyCompleted: new Array(12).fill(0),
            assignedGroups: new Set<string>(),
            averageVote: 0,
            votedTasks: 0,
            recentTasks: [],
          };
        }
        stats[k].total += 1;
        if (completed) {
          stats[k].completed += 1;
          if (taskMonth >= 0) stats[k].monthlyCompleted[taskMonth] += 1;
        } else if (overdue) stats[k].overdue += 1;
        else stats[k].active += 1;
        if (groupName) stats[k].assignedGroups.add(groupName);
        if (vote != null) {
          stats[k].averageVote += vote;
          stats[k].votedTasks += 1;
        }
        if (stats[k].recentTasks.length < 10) {
          stats[k].recentTasks.push({
            id: task?.id ?? "",
            title: taskTitle,
            group: groupName,
            status,
            due: dueStr,
            vote,
          });
        }
      }
    }

    const list = (Object.values(stats) as (MStat & { key?: string })[]).map((m) => {
      if (m.votedTasks > 0) m.averageVote = Math.round((m.averageVote / m.votedTasks) * 10) / 10;
      else m.averageVote = 0;
      return m;
    });
    list.sort((a: MStat, b: MStat) => {
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

  type DrillStat = {
    name: string;
    teamLabel: string;
    total: number;
    completed: number;
    active: number;
    overdue: number;
    monthlyCompleted: number[];
    assignedGroups: Set<string>;
    averageVote: number;
    votedTasks: number;
    recentTasks: {
      id: number | string;
      title: string;
      group: string;
      status: string;
      due: string | null;
      vote: number | null;
    }[];
  };

  const [drillMember, setDrillMember] = useState<DrillStat | null>(null);

  const monthlyTrend = useMemo(() => {
    if (!drillMember) return [] as { month: string; done: number; overdue: number; total: number }[];
    const labels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    return labels.map((label, idx) => {
      const done = drillMember.monthlyCompleted[idx] ?? 0;
      const overdue =
        drillMember.recentTasks.filter((t) => {
          if (!t.due) return false;
          const d = new Date(t.due);
          return (
            !isNaN(d.getTime()) &&
            d.getMonth() === idx &&
            (t.status ? String(t.status) !== "Completed" : true) &&
            d.getTime() < Date.now()
          );
        }).length;
      return { month: label, done, overdue, total: done + drillMember.active };
    });
  }, [drillMember]);

  const voteData = useMemo(() => {
    if (!drillMember) return [];
    const buckets = [
      { key: "5⭐ Tốt", min: 4.5, value: 0, color: "hsl(var(--status-success))" },
      { key: "4⭐ Khá", min: 3.5, value: 0, color: "hsl(var(--primary))" },
      { key: "3⭐ Bình thường", min: 2.5, value: 0, color: "hsl(var(--status-warning))" },
      { key: "Dưới 3⭐", min: 0, value: 0, color: "hsl(var(--status-danger))" },
    ];
    for (const t of drillMember.recentTasks) {
      if (t.vote == null) continue;
      if (t.vote >= 4.5) buckets[0].value += 1;
      else if (t.vote >= 3.5) buckets[1].value += 1;
      else if (t.vote >= 2.5) buckets[2].value += 1;
      else buckets[3].value += 1;
    }
    const tot = buckets.reduce((s, b) => s + b.value, 0);
    if (tot === 0 && drillMember.votedTasks > 0) {
      buckets[0].value = Math.max(1, Math.round((drillMember.averageVote / 5) * drillMember.votedTasks));
    }
    return buckets;
  }, [drillMember]);

  if (isLoading) {
    return <CardGridSkeleton cards={6} withHeader cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />;
  }

  function getStatusBadgeClass(status: string): string {
    const s = String(status ?? "").toLowerCase();
    if (s.includes("complete") || s === "hoàn thành")
      return "bg-status-success/15 text-status-success border-status-success/25";
    if (s.includes("progress") || s.includes("làm"))
      return "bg-status-info/15 text-status-info border-status-info/25";
    if (s.includes("cancel") || s === "hủy")
      return "bg-muted/60 text-muted-foreground border-border";
    if (s.includes("overdue") || s.includes("quá hạn"))
      return "bg-status-danger/15 text-status-danger border-status-danger/25";
    if (s.includes("pend"))
      return "bg-status-warning/15 text-status-warning border-status-warning/25";
    return "bg-muted/50 text-muted-foreground border-border";
  }

  return (
    <div className="space-y-6">
      <GroupPageHero
        groupCode="team"
        syncedAt={new Date()}
        showRefresh
        isRefreshing={isRefreshing}
        onRefresh={() => refresh()}
        countBadge={{
          label:
            language === "vi"
              ? `${teamStats.length} thành viên`
              : `${teamStats.length} members`,
          tone: "default",
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamStats.map((member) => (
          <Card
            key={member.name}
            className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-start gap-4 pb-2">
              {(() => {
                const key = normalizeDisplayName(member.name);
                const u = userByNormalizedName.get(key);
                const avatarSrc =
                  u?.id && u?.avatarPath
                    ? `${api.users.avatar.path.replace(":id", u.id)}?v=${encodeURIComponent(String(u.updatedAt ?? ""))}`
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`;
                return (
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm ring-1 ring-primary/20">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback>
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                );
              })()}
              <div className="flex flex-col min-w-0 flex-1">
                <CardTitle className="text-base font-semibold font-display truncate">
                  {member.name}
                </CardTitle>
                <span className="text-xs text-muted-foreground truncate">
                  {member.teamLabel}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {member.overdue > 0 ? (
                    <Badge
                      variant="outline"
                      className="h-5 border-status-danger/30 bg-status-danger/10 text-status-danger">
                      ⚠️ {language === "vi" ? `${member.overdue} quá hạn` : `${member.overdue} overdue`}
                    </Badge>
                  ) : null}
                  {member.votedTasks > 0 ? (
                    <Badge variant="outline" className="h-5 bg-secondary/30 text-secondary-foreground border-secondary/30">
                      <Star className="h-3 w-3 mr-1" />
                      {member.averageVote.toFixed(1)}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                  <span className="text-xl font-bold font-display">
                    {member.total}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    {language === "vi" ? "Tổng" : "Total"}
                  </span>
                </div>
                <div className="flex flex-col p-2 rounded-lg bg-status-success/10 text-status-success">
                  <span className="text-xl font-bold font-display">
                    {member.completed}
                  </span>
                  <span className="text-[10px] uppercase font-medium opacity-90">
                    {language === "vi" ? "Hoàn thành" : "Done"}
                  </span>
                </div>
                <div className="flex flex-col p-2 rounded-lg bg-status-info/10 text-status-info">
                  <span className="text-xl font-bold font-display">
                    {member.active}
                  </span>
                  <span className="text-[10px] uppercase font-medium opacity-90">
                    {language === "vi" ? "Đang làm" : "Active"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {language === "vi" ? "Hiệu suất" : "Efficiency"}
                  </span>
                  <span className="font-medium tabular-nums">
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

              <MemberHeatmap12m
                monthlyCompletions={member.monthlyCompleted}
                className="pt-1"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                onClick={() => setDrillMember(member as DrillStat)}>
                {language === "vi" ? "Xem chi tiết" : "View details"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={drillMember !== null}
        onOpenChange={(open) => {
          if (!open) setDrillMember(null);
        }}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden gap-0">
          {drillMember ? (
            <div className="flex flex-col">
              <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-b from-card to-background">
                <div className="flex items-start gap-4">
                  {(() => {
                    const key = normalizeDisplayName(drillMember.name);
                    const u = userByNormalizedName.get(key);
                    const avatarSrc =
                      u?.id && u?.avatarPath
                        ? `${api.users.avatar.path.replace(":id", u.id)}?v=${encodeURIComponent(String(u.updatedAt ?? ""))}`
                        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${drillMember.name}`;
                    return (
                      <Avatar className="h-14 w-14 border-2 border-background shadow-md ring-1 ring-primary/20">
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback className="text-lg font-semibold">
                          {drillMember.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })()}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <DialogTitle className="text-2xl font-bold font-display tracking-tight">
                      {drillMember.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      {drillMember.teamLabel} · {language === "vi" ? "Thành viên nhóm" : "Team member"}
                    </DialogDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="h-6">
                        <Briefcase className="h-3 w-3 mr-1.5" />
                        {language === "vi" ? `${drillMember.total} nhiệm vụ` : `${drillMember.total} tasks`}
                      </Badge>
                      <Badge className="h-6 bg-status-success/15 text-status-success border-status-success/30">
                        ✅ {drillMember.completed}
                      </Badge>
                      <Badge className="h-6 bg-status-info/15 text-status-info border-status-info/30">
                        ⚡ {drillMember.active}
                      </Badge>
                      {drillMember.overdue > 0 ? (
                        <Badge className="h-6 bg-status-danger/15 text-status-danger border-status-danger/30">
                          ⚠️ {drillMember.overdue}
                        </Badge>
                      ) : null}
                      {drillMember.votedTasks > 0 ? (
                        <Badge variant="outline" className="h-6 bg-secondary/30 border-secondary/30 text-secondary-foreground">
                          <Star className="h-3 w-3 mr-1.5" />
                          {drillMember.averageVote.toFixed(1)}
                          <span className="opacity-60 ml-1">
                            / {drillMember.votedTasks}
                          </span>
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="recent" className="p-6 pt-4">
                <TabsList className="mb-4">
                  <TabsTrigger value="recent" className="gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {language === "vi" ? "Công việc gần đây" : "Recent tasks"}
                  </TabsTrigger>
                  <TabsTrigger value="trend" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {language === "vi" ? "Xu hướng thời gian" : "Over time"}
                  </TabsTrigger>
                  <TabsTrigger value="vote" className="gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    {language === "vi" ? "Đánh giá" : "Reviews"}
                  </TabsTrigger>
                  <TabsTrigger value="assign" className="gap-1.5">
                    <UsersRound className="h-3.5 w-3.5" />
                    {language === "vi" ? "Phân bổ" : "Groups"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recent" className="mt-0">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="grid grid-cols-12 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                      <div className="col-span-1">ID</div>
                      <div className="col-span-5">{language === "vi" ? "Tiêu đề" : "Title"}</div>
                      <div className="col-span-2">{language === "vi" ? "Nhóm" : "Group"}</div>
                      <div className="col-span-2">{language === "vi" ? "Trạng thái" : "Status"}</div>
                      <div className="col-span-2 text-right">{language === "vi" ? "Hạn / Vote" : "Due / Vote"}</div>
                    </div>
                    <div className="max-h-[420px] overflow-auto">
                      {drillMember.recentTasks.length === 0 ? (
                        <div className="p-10 text-center text-sm text-muted-foreground">
                          {language === "vi"
                            ? "Chưa có công việc nào gán cho thành viên này."
                            : "No tasks assigned yet."}
                        </div>
                      ) : (
                        drillMember.recentTasks.map((t) => (
                          <div
                            key={`${t.id}-${t.title}`}
                            className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors">
                            <div className="col-span-1 font-mono text-xs text-muted-foreground tabular-nums">
                              #{String(t.id)}
                            </div>
                            <div className="col-span-5 min-w-0">
                              <span className="truncate block font-medium text-foreground">
                                {t.title}
                              </span>
                            </div>
                            <div className="col-span-2 min-w-0">
                              {t.group ? (
                                <Badge variant="outline" className="truncate max-w-full h-5 bg-primary/8 border-primary/20 text-primary">
                                  {t.group}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/80">—</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <Badge
                                variant="outline"
                                className={`h-5 ${getStatusBadgeClass(t.status)}`}>
                                {t.status || (language === "vi" ? "Chưa rõ" : "—")}
                              </Badge>
                            </div>
                            <div className="col-span-2 flex flex-col items-end gap-1 text-right">
                              {t.due ? (
                                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                                  {t.due}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">—</span>
                              )}
                              {t.vote != null ? (
                                <span className="text-xs text-secondary-foreground">
                                  ⭐ {t.vote.toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="trend" className="mt-0">
                  <div className="rounded-lg border border-border p-4 bg-card">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">
                        {language === "vi"
                          ? "Biểu đồ xu hướng 12 tháng gần đây"
                          : "12-month task trend"}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-4 rounded-sm bg-status-success" />
                          {language === "vi" ? "Hoàn thành" : "Completed"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-4 rounded-sm bg-status-danger" />
                          {language === "vi" ? "Quá hạn" : "Overdue"}
                        </span>
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyTrend}
                          margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="month"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <ReTooltip
                            cursor={{ stroke: "hsl(var(--border))" }}
                            contentStyle={{
                              background: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="done"
                            name={language === "vi" ? "Hoàn thành" : "Done"}
                            stroke="hsl(var(--status-success))"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "hsl(var(--status-success))" }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="overdue"
                            name={language === "vi" ? "Quá hạn" : "Overdue"}
                            stroke="hsl(var(--status-danger))"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 2.5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4">
                      <MemberHeatmap12m
                        monthlyCompletions={drillMember.monthlyCompleted}
                        className="border-t border-border pt-4"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vote" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-lg border border-border p-4 bg-card">
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        {language === "vi"
                          ? "Phân bố đánh giá công việc"
                          : "Review distribution"}
                      </h4>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={voteData}
                              dataKey="value"
                              nameKey="key"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                            >
                              {voteData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: 12 }}
                            />
                            <ReTooltip
                              contentStyle={{
                                background: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-6 bg-card flex flex-col justify-center gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          {language === "vi" ? "Đánh giá trung bình" : "Average review"}
                        </span>
                        <div className="flex items-end gap-2">
                          <span className="text-5xl font-bold font-display tabular-nums text-foreground">
                            {drillMember.averageVote.toFixed(1)}
                          </span>
                          <span className="text-lg mb-1.5 opacity-60">/ 5.0</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={
                                i <= Math.round(drillMember.averageVote)
                                  ? "h-5 w-5 fill-secondary text-secondary-foreground"
                                  : "h-5 w-5 text-muted-foreground/30"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <div className="text-xs text-muted-foreground">
                            {language === "vi" ? "Công việc đã đánh giá" : "Reviewed tasks"}
                          </div>
                          <div className="text-2xl font-bold font-display tabular-nums mt-0.5">
                            {drillMember.votedTasks}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                          <div className="text-xs text-muted-foreground">
                            {language === "vi" ? "Tổng nhiệm vụ" : "Total tasks"}
                          </div>
                          <div className="text-2xl font-bold font-display tabular-nums mt-0.5">
                            {drillMember.total}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assign" className="mt-0">
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        {language === "vi" ? "Nhóm đảm nhiệm" : "Assigned groups"}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {drillMember.assignedGroups.size === 0 ? (
                          <span className="text-sm text-muted-foreground/80">
                            —
                          </span>
                        ) : (
                          Array.from(drillMember.assignedGroups)
                            .sort((a, b) => a.localeCompare(b, "vi"))
                            .map((g) => (
                              <Badge
                                key={g}
                                variant="outline"
                                className="bg-primary/8 border-primary/25 text-primary h-6 px-3">
                                {g}
                              </Badge>
                            ))
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          {language === "vi" ? "Hoàn thành / Tổng" : "Done / Total"}
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-3xl font-bold font-display tabular-nums">
                            {drillMember.completed}
                          </span>
                          <span className="text-lg text-muted-foreground tabular-nums">
                            / {drillMember.total}
                          </span>
                        </div>
                        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-status-success"
                            style={{
                              width: `${
                                drillMember.total > 0
                                  ? (drillMember.completed / drillMember.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          {language === "vi" ? "Đang làm" : "Active"}
                        </div>
                        <div className="mt-2">
                          <span className="text-3xl font-bold font-display tabular-nums text-status-info">
                            {drillMember.active}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          {language === "vi" ? "Quá hạn" : "Overdue"}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`text-3xl font-bold font-display tabular-nums ${
                              drillMember.overdue > 0
                                ? "text-status-danger"
                                : "text-status-success"
                            }`}>
                            {drillMember.overdue}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
