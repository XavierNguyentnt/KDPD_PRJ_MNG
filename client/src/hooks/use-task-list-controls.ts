import { useMemo, useState } from "react";
import type { TaskWithAssignmentDetails, Work } from "@shared/schema";
import { UserRole, UserRoleType } from "./use-tasks";
import { normalizeSearch } from "@/lib/utils";
import {
  applyTaskFilters,
  getDefaultTaskFilters,
  type TaskFilterState,
} from "@/components/task-filters";
import { sortTasks, type TaskSortColumn } from "@/components/task-table";

type ViewMode = "table" | "board";

export function useTaskListControls(params: {
  tasks?: TaskWithAssignmentDetails[] | null;
  role: UserRoleType;
  userDisplayName?: string | null;
  works: Work[];
  includedGroups?: string[] | null;
}) {
  const { tasks, role, userDisplayName, works, includedGroups } = params;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TaskFilterState>(
    getDefaultTaskFilters,
  );
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<TaskSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const availableGroups = useMemo(() => {
    if (!tasks) return [];
    const groups = new Set(
      tasks
        .filter((t) =>
          includedGroups && includedGroups.length > 0
            ? includedGroups.includes(t.group || "")
            : true,
        )
        .map((t) => t.group)
        .filter(Boolean),
    );
    return Array.from(groups).sort();
  }, [tasks, includedGroups]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let list = tasks.slice();
    if (includedGroups && includedGroups.length > 0) {
      list = list.filter((t) => includedGroups.includes(t.group || ""));
    }
    if (groupFilter !== "all") {
      list = list.filter((t) => t.group === groupFilter);
    }
    if (role === UserRole.EMPLOYEE) {
      const firstName = (userDisplayName ?? "").split(" ")[0];
      list = list.filter((t) => t.assignee?.includes(firstName));
    }
    if (search.trim()) {
      const q = normalizeSearch(search.trim());
      list = list.filter(
        (t) =>
          normalizeSearch(t.title ?? "").includes(q) ||
          normalizeSearch(t.description ?? "").includes(q) ||
          normalizeSearch(t.assignee ?? "").includes(q) ||
          normalizeSearch(t.id ?? "").includes(q),
      );
    }
    list = applyTaskFilters(list, filters, works);
    return sortTasks(list, sortBy, sortDir);
  }, [
    tasks,
    includedGroups,
    groupFilter,
    role,
    userDisplayName,
    search,
    filters,
    works,
    sortBy,
    sortDir,
  ]);

  function handleSort(column: TaskSortColumn) {
    setSortBy((prev) => {
      if (prev === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      return column;
    });
  }

  return {
    search,
    setSearch,
    filters,
    setFilters,
    groupFilter,
    setGroupFilter,
    sortBy,
    sortDir,
    handleSort,
    viewMode,
    setViewMode,
    filteredTasks,
    availableGroups,
  };
}
