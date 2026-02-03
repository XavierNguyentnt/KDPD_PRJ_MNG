import { useEffect, useMemo, useState } from "react";
import type { TaskWithAssignmentDetails, Work } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BienTapWorkflowHelpers, StageStatus, type Workflow } from "@shared/workflow";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { normalizeSearch } from "@/lib/utils";
import { Eye } from "lucide-react";

type RoundItem = {
  task: TaskWithAssignmentDetails;
  roundNumber: number;
  roundType: string;
  status: StageStatus;
  workflow: Workflow | null;
  dueDate: string | null;
  progress: number;
};

interface BienTapWorkProgressProps {
  tasks: TaskWithAssignmentDetails[];
  works: Work[];
  components: { id: string; name: string }[];
}

const PAGE_SIZE = 20;

const statusBadgeClasses: Record<StageStatus, string> = {
  [StageStatus.COMPLETED]: "bg-green-100 text-green-700 border-green-300",
  [StageStatus.IN_PROGRESS]: "bg-blue-100 text-blue-700 border-blue-300",
  [StageStatus.PENDING]: "bg-amber-100 text-amber-700 border-amber-300",
  [StageStatus.CANCELLED]: "bg-amber-100 text-amber-700 border-amber-300",
  [StageStatus.NOT_STARTED]: "bg-slate-100 text-slate-700 border-slate-300",
};

const statusLabel: Record<StageStatus, string> = {
  [StageStatus.COMPLETED]: "Hoàn thành",
  [StageStatus.IN_PROGRESS]: "Đang tiến hành",
  [StageStatus.PENDING]: "Tạm dừng",
  [StageStatus.CANCELLED]: "Đã hủy",
  [StageStatus.NOT_STARTED]: "Chưa bắt đầu",
};

const mapTaskStatusToStageStatus = (status?: string | null): StageStatus => {
  switch (status) {
    case "Completed":
      return StageStatus.COMPLETED;
    case "In Progress":
      return StageStatus.IN_PROGRESS;
    case "Pending":
      return StageStatus.PENDING;
    case "Cancelled":
      return StageStatus.CANCELLED;
    case "Not Started":
    default:
      return StageStatus.NOT_STARTED;
  }
};

const parseWorkflow = (raw: unknown): Workflow | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Workflow;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Workflow;
  return null;
};

const getRoundNumber = (workflow: Workflow | null, task: TaskWithAssignmentDetails): number => {
  const round = workflow?.rounds?.[0]?.roundNumber;
  if (typeof round === "number") return round;
  const assignmentRound = task.assignments?.[0]?.roundNumber;
  if (typeof assignmentRound === "number") return assignmentRound;
  return 1;
};

const getRoundType = (workflow: Workflow | null, roundNumber: number): string => {
  const roundType = workflow?.rounds?.[0]?.roundType;
  if (roundType) return roundType;
  return `Bông ${roundNumber}`;
};

const getRoundsForTasks = (workTasks: TaskWithAssignmentDetails[]): RoundItem[] =>
  workTasks
    .map((task) => {
      const workflow = parseWorkflow(task.workflow);
      const roundNumber = getRoundNumber(workflow, task);
      const roundType = getRoundType(workflow, roundNumber);
      const status = workflow?.rounds?.[0]?.status ?? mapTaskStatusToStageStatus(task.status);
      const progress = workflow ? BienTapWorkflowHelpers.calculateProgress(workflow) : (task.progress ?? 0);
      return {
        task,
        roundNumber,
        roundType,
        status,
        workflow,
        dueDate: (task.dueDate as string | null) ?? null,
        progress,
      };
    })
    .sort((a, b) => a.roundNumber - b.roundNumber);

const formatRemaining = (dueDate?: string | null): string => {
  if (!dueDate) return "Chưa có hạn";
  const parsed = parseISO(dueDate);
  if (Number.isNaN(parsed.getTime())) return "Chưa có hạn";
  const days = differenceInCalendarDays(parsed, new Date());
  if (days === 0) return "Đến hạn hôm nay";
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  return `Còn ${days} ngày`;
};

const isOverdue = (dueDate?: string | null): boolean => {
  if (!dueDate) return false;
  const parsed = parseISO(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return differenceInCalendarDays(parsed, new Date()) < 0;
};

const getRoundPillClass = (round: RoundItem): string => {
  if (round.progress >= 100 || round.status === StageStatus.COMPLETED) {
    return "bg-green-100 text-green-700 border-green-300";
  }
  if (round.status === StageStatus.IN_PROGRESS && isOverdue(round.dueDate)) {
    return "bg-red-100 text-red-700 border-red-300";
  }
  if (round.status === StageStatus.IN_PROGRESS) {
    return "bg-blue-100 text-blue-700 border-blue-300";
  }
  return "bg-slate-100 text-slate-700 border-slate-300";
};

const getAssigneesForWork = (rounds: RoundItem[]): string[] => {
  const names = new Set<string>();
  rounds.forEach((round) => {
    round.workflow?.rounds?.[0]?.stages?.forEach((stage) => {
      if (stage.assignee) names.add(stage.assignee);
    });
  });
  return Array.from(names);
};

const getWorkVotes = (tasks: TaskWithAssignmentDetails[]): string[] => {
  const votes = new Set<string>();
  tasks.forEach((task) => {
    if (task.vote) votes.add(task.vote);
  });
  return Array.from(votes);
};

const getProgressStatus = (rounds: RoundItem[]): "completed" | "in_progress" | "overdue" | "not_completed" => {
  if (rounds.length === 0) return "not_completed";
  const allCompleted = rounds.every((r) => r.status === StageStatus.COMPLETED || r.progress >= 100);
  if (allCompleted) return "completed";
  const currentRound = rounds.find((r) => r.status !== StageStatus.COMPLETED) || rounds[rounds.length - 1];
  if (currentRound?.status === StageStatus.IN_PROGRESS && isOverdue(currentRound.dueDate)) return "overdue";
  if (rounds.some((r) => r.status === StageStatus.IN_PROGRESS)) return "in_progress";
  return "not_completed";
};

const formatStageDisplay = (stage: string | null | undefined): string => {
  if (!stage) return "—";
  const num = String(stage).replace(/\D/g, "");
  return num ? `GĐ ${num}` : `GĐ ${stage}`;
};

const generatePaginationItems = (currentPage: number, totalPages: number): (number | "ellipsis")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [];
  if (currentPage <= 3) {
    for (let i = 1; i <= 5; i += 1) items.push(i);
    items.push("ellipsis");
    items.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    items.push(1);
    items.push("ellipsis");
    for (let i = totalPages - 4; i <= totalPages; i += 1) items.push(i);
  } else {
    items.push(1);
    items.push("ellipsis");
    items.push(currentPage - 1);
    items.push(currentPage);
    items.push(currentPage + 1);
    items.push("ellipsis");
    items.push(totalPages);
  }
  return items;
};

export function BienTapWorkProgress({ tasks, works, components }: BienTapWorkProgressProps) {
  const workGroups = useMemo(() => {
    const workIds = new Set(tasks.map((task) => task.relatedWorkId).filter(Boolean));
    const workMap = new Map(works.map((work) => [work.id, work]));
    const items = Array.from(workIds)
      .map((workId) => {
        const work = workMap.get(workId as string);
        if (!work) return null;
        const workTasks = tasks.filter((task) => task.relatedWorkId === workId);
        return { work, tasks: workTasks };
      })
      .filter(Boolean) as Array<{ work: Work; tasks: TaskWithAssignmentDetails[] }>;
    return items.sort((a, b) => (a.work.titleVi || "").localeCompare(b.work.titleVi || ""));
  }, [tasks, works]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [componentFilter, setComponentFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [voteFilter, setVoteFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const totalPages = Math.max(1, Math.ceil(workGroups.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stageOptions = useMemo(
    () =>
      Array.from(new Set(workGroups.map(({ work }) => work.stage).filter(Boolean))) as string[],
    [workGroups]
  );

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    workGroups.forEach(({ tasks: workTasks }) => {
      getRoundsForTasks(workTasks).forEach((round) => {
        round.workflow?.rounds?.[0]?.stages?.forEach((stage) => {
          if (stage.assignee) names.add(stage.assignee);
        });
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [workGroups]);

  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(search.trim());
    return workGroups
      .map(({ work, tasks: workTasks }) => {
        const rounds = getRoundsForTasks(workTasks);
        const assignees = getAssigneesForWork(rounds);
        const votes = getWorkVotes(workTasks);
        const progressStatus = getProgressStatus(rounds);
        const currentRound = rounds.find((round) => round.status !== StageStatus.COMPLETED) || rounds[rounds.length - 1];
        const completedRounds = rounds.filter((round) => round.status === StageStatus.COMPLETED).length;
        const totalRounds = rounds.length || 1;
        return { work, tasks: workTasks, rounds, assignees, votes, progressStatus, currentRound, completedRounds, totalRounds };
      })
      .filter(({ work, assignees, votes, progressStatus }) => {
        if (componentFilter !== "all" && work.componentId !== componentFilter) return false;
        if (stageFilter !== "all" && work.stage !== stageFilter) return false;
        if (progressFilter !== "all" && progressStatus !== progressFilter) return false;
        if (voteFilter !== "all" && !votes.includes(voteFilter)) return false;
        if (assigneeFilter !== "all" && !assignees.includes(assigneeFilter)) return false;
        if (!q) return true;
        return (
          normalizeSearch(work.titleVi || "").includes(q) ||
          normalizeSearch(work.titleHannom || "").includes(q) ||
          normalizeSearch(work.documentCode || "").includes(q)
        );
      });
  }, [
    workGroups,
    search,
    componentFilter,
    stageFilter,
    progressFilter,
    voteFilter,
    assigneeFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, componentFilter, stageFilter, progressFilter, voteFilter, assigneeFilter]);

  const pagedGroups = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredGroups.slice(start, start + PAGE_SIZE);
  }, [page, filteredGroups]);

  const selectedGroup = useMemo(
    () => filteredGroups.find(({ work }) => work.id === selectedWorkId) || null,
    [filteredGroups, selectedWorkId]
  );

  const detailRounds = useMemo<RoundItem[]>(() => {
    if (!selectedGroup) return [];
    return getRoundsForTasks(selectedGroup.tasks);
  }, [selectedGroup]);

  const totalPagesFiltered = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Theo dõi tiến độ biên tập theo tác phẩm</CardTitle>
        <p className="text-sm text-muted-foreground">
          Toàn bộ tác phẩm đang biên tập, gói gọn trong từng thẻ để dễ theo dõi tiến độ.
        </p>
        <div className="flex flex-col gap-3">
          <div className="max-w-sm">
            <Input
              placeholder="Tìm tác phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Hợp phần</Label>
              <Select value={componentFilter} onValueChange={setComponentFilter}>
                <SelectTrigger className="w-[180px] h-9 bg-background">
                  <SelectValue placeholder="Tất cả hợp phần" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả hợp phần</SelectItem>
                  {components.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Giai đoạn</Label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[160px] h-9 bg-background">
                  <SelectValue placeholder="Tất cả giai đoạn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả giai đoạn</SelectItem>
                  {stageOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatStageDisplay(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Tiến độ</Label>
              <Select value={progressFilter} onValueChange={setProgressFilter}>
                <SelectTrigger className="w-[160px] h-9 bg-background">
                  <SelectValue placeholder="Tất cả tiến độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="in_progress">Đang tiến hành</SelectItem>
                  <SelectItem value="overdue">Chậm tiến độ</SelectItem>
                  <SelectItem value="not_completed">Chưa hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Đánh giá</Label>
              <Select value={voteFilter} onValueChange={setVoteFilter}>
                <SelectTrigger className="w-[180px] h-9 bg-background">
                  <SelectValue placeholder="Tất cả đánh giá" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="tot">Hoàn thành tốt</SelectItem>
                  <SelectItem value="kha">Hoàn thành khá</SelectItem>
                  <SelectItem value="khong_tot">Không tốt</SelectItem>
                  <SelectItem value="khong_hoan_thanh">Không hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Nhân sự</Label>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[180px] h-9 bg-background">
                  <SelectValue placeholder="Tất cả nhân sự" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {assigneeOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Không tìm thấy tác phẩm phù hợp.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pagedGroups.map(({ work, rounds, currentRound, completedRounds, totalRounds, assignees }) => {
                const assigneeSummary = assignees.length > 0 ? assignees.join(", ") : "Chưa giao";

                return (
                  <Card key={work.id} className="border-border/50 bg-muted/30 hover:bg-muted/40 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <CardTitle className="text-sm font-semibold line-clamp-2">
                            {work.titleVi || "Chưa có tên"}
                          </CardTitle>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            Nhân sự: <span className="text-foreground">{assigneeSummary}</span>
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedWorkId(work.id);
                                  setDetailOpen(true);
                                }}
                                aria-label="Xem chi tiết"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Xem chi tiết</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Hoàn thành {completedRounds}/{totalRounds} giai đoạn</span>
                        <span>{formatRemaining(currentRound?.dueDate)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rounds.map((round) => (
                          <Badge
                            key={`${work.id}-${round.roundNumber}`}
                            variant="outline"
                            className={`${getRoundPillClass(round)} text-xs`}
                          >
                            {round.roundType} {round.progress}%
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPagesFiltered > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                    {generatePaginationItems(page, totalPagesFiltered).map((p, idx) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink onClick={() => setPage(p)} isActive={p === page}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPagesFiltered, p + 1))}
                        className={page === totalPagesFiltered ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGroup?.work.titleVi || "Chi tiết tác phẩm"}
            </DialogTitle>
          </DialogHeader>
          {selectedGroup ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {selectedGroup.work.documentCode ? `Mã tài liệu: ${selectedGroup.work.documentCode}` : null}
              </div>
              <div className="space-y-3">
                {detailRounds.map((round) => (
                  <div key={`${selectedGroup.work.id}-${round.roundNumber}`} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{round.roundType}</div>
                      <Badge variant="outline" className={statusBadgeClasses[round.status]}>
                        {statusLabel[round.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                      <div>Công việc: <span className="text-foreground">{round.task.title}</span></div>
                      <div>Tiến độ: <span className="text-foreground">{round.progress}%</span></div>
                      <div>Hạn dự kiến: <span className="text-foreground">{round.dueDate || "Chưa có hạn"}</span></div>
                    </div>
                    <div className="mt-2">
                      <Progress value={round.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Không có dữ liệu.</div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
