import { useMemo, useState, useEffect } from "react";
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import { UserRole, UserRoleType } from "@/hooks/use-tasks";
import { normalizeSearch } from "@/lib/utils";
import {
  applyTaskFilters,
  getDefaultTaskFilters,
  type TaskFilterState,
} from "@/components/task-filters";
import { sortTasks, type TaskSortColumn } from "@/components/task-table";
import { getTaskStatsBadgeKeyFromFilters } from "@/components/task-stats";
import type {
  TaskWithAssignmentDetails,
  Work,
  TranslationContract,
  ProofreadingContract,
  Component,
} from "@shared/schema";

interface UseThuKyTasksTabParams {
  tasks: TaskWithAssignmentDetails[];
  worksScoped: Work[];
  allowedComponentIds: string[];
  role: UserRoleType;
  userId?: string | null;
  userDisplayName?: string | null;
  tcScoped: TranslationContract[];
  pcScoped: ProofreadingContract[];
  componentsList: Component[];
  PAGE_SIZE: number;
}

export function useThuKyTasksTab(params: UseThuKyTasksTabParams) {
  const {
    tasks,
    worksScoped,
    allowedComponentIds,
    role,
    userId,
    userDisplayName,
    tcScoped,
    pcScoped,
    componentsList,
    PAGE_SIZE,
  } = params;

  const [tasksPage, setTasksPage] = useState(1);
  const [isExportingTasks, setIsExportingTasks] = useState(false);

  const tasksScoped = useMemo(() => {
    if (!tasks) return [];
    let list = tasks.filter((t) => t.group === "Thư ký hợp phần");
    if (allowedComponentIds.length > 0) {
      const allowedWorkIds = new Set(worksScoped.map((w) => w.id));
      const allowedTcIds = new Set(tcScoped.map((c) => c.id));
      const allowedPcIds = new Set(pcScoped.map((c) => c.id));
      list = list.filter(
        (t) =>
          (!t.relatedWorkId && !t.relatedContractId) ||
          (t.relatedWorkId && allowedWorkIds.has(t.relatedWorkId)) ||
          (t.relatedContractId &&
            (allowedTcIds.has(t.relatedContractId) ||
              allowedPcIds.has(t.relatedContractId))),
      );
    }
    if (role === UserRole.EMPLOYEE) {
      const uid = userId ?? null;
      if (uid) {
        list = list.filter(
          (t) =>
            (t as any).createdBy === uid ||
            t.assigneeId === uid ||
            (Array.isArray(t.assignments)
              ? t.assignments.some((a: any) => a?.userId === uid)
              : false) ||
            t.assignee?.includes((userDisplayName ?? "").split(" ")[0]),
        );
      } else {
        list = list.filter((t) =>
          t.assignee?.includes((userDisplayName ?? "").split(" ")[0]),
        );
      }
    }
    return list;
  }, [
    tasks,
    allowedComponentIds,
    worksScoped,
    tcScoped,
    pcScoped,
    role,
    userDisplayName,
    userId,
  ]);

  const {
    search: tasksSearch,
    setSearch: setTasksSearch,
    filters: taskFilters,
    setFilters: setTaskFilters,
    sortBy: taskSortBy,
    sortDir: taskSortDir,
    handleSort: handleTaskSort,
    viewMode: taskViewMode,
    setViewMode: setTaskViewMode,
    filteredTasks,
    tasksForStats,
    availableYears: taskYearOptions,
    periodOptions: taskPeriodOptions,
  } = useTaskListControls({
    tasks: tasksScoped,
    role,
    userId,
    userDisplayName,
    works: worksScoped,
    includedGroups: null,
  });

  const taskStages = useMemo(
    () =>
      Array.from(
        new Set(worksScoped.map((w) => w.stage).filter(Boolean)),
      ) as string[],
    [worksScoped],
  );

  const taskComponentOptions = useMemo(
    () => componentsList.map((c) => ({ id: c.id, name: c.name })),
    [componentsList],
  );

  const activeStatsKey = useMemo(
    () => getTaskStatsBadgeKeyFromFilters(taskFilters),
    [taskFilters.status, taskFilters.vote],
  );

  const paginatedTasks = useMemo(() => {
    const start = (tasksPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, tasksPage, PAGE_SIZE]);

  const totalTasksPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / PAGE_SIZE),
  );

  return {
    tasksPage,
    setTasksPage,
    isExportingTasks,
    setIsExportingTasks,
    tasksScoped,
    taskStages,
    taskComponentOptions,
    tasksSearch,
    setTasksSearch,
    taskFilters,
    setTaskFilters,
    taskSortBy,
    taskSortDir,
    handleTaskSort,
    taskViewMode,
    setTaskViewMode,
    filteredTasks,
    tasksForStats,
    taskYearOptions,
    taskPeriodOptions,
    activeStatsKey,
    paginatedTasks,
    totalTasksPages,
  };
}
