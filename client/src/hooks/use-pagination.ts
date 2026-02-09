import { useState, useMemo, useEffect } from "react";

export function usePagination(totalCount: number, pageSize: number = 10) {
  const [page, setPage] = useState(1);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / pageSize)),
    [totalCount, pageSize]
  );
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  function slice<T>(items: T[]): T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }
  function paginationItems(): (number | "ellipsis")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | "ellipsis")[] = [];
    if (page <= 3) {
      for (let i = 1; i <= 5; i++) items.push(i);
      items.push("ellipsis", totalPages);
    } else if (page >= totalPages - 2) {
      items.push(1, "ellipsis");
      for (let i = totalPages - 4; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
    }
    return items;
  }
  return { page, setPage, totalPages, slice, paginationItems };
}
