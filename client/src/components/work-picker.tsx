import { useState, useMemo, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn, normalizeSearch } from "@/lib/utils";
import { Check, ChevronDown, FileText, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Work } from "@shared/schema";
import type { Component as ComponentType } from "@shared/schema";

function formatStageForSearch(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "";
  const num = String(stage).replace(/\D/g, "");
  return num ? "GĐ " + num : "";
}

interface WorkPickerProps {
  works: Work[];
  components?: ComponentType[];
  value: string | null; // workId
  onChange: (workId: string | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  componentFilterId?: string | null;
}

export function WorkPicker({
  works,
  components = [],
  value,
  onChange,
  disabled,
  label,
  placeholder = "Tìm theo tiêu đề, mã tài liệu, hợp phần, giai đoạn...",
  className,
  componentFilterId,
}: WorkPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filtered = useMemo(() => {
    const sourceWorks =
      componentFilterId && componentFilterId.trim() !== ""
        ? works.filter((w) => w.componentId === componentFilterId)
        : works;
    if (!search.trim()) return sourceWorks;
    const q = normalizeSearch(search.trim());
    if (!q) return sourceWorks;
    return sourceWorks.filter((w) => {
      const compName =
        w.componentId && components.length
          ? components.find((c) => c.id === w.componentId)?.name ?? ""
          : "";
      const stageStr = formatStageForSearch(w.stage ?? null);
      return (
        (w.titleVi && normalizeSearch(w.titleVi).includes(q)) ||
        (w.documentCode && normalizeSearch(w.documentCode).includes(q)) ||
        normalizeSearch(compName).includes(q) ||
        normalizeSearch(stageStr).includes(q)
      );
    });
  }, [works, components, search, componentFilterId]);

  const visibleWorks = useMemo(() => filtered.slice(0, 100), [filtered]);

  const selectedWork = useMemo(
    () => works.find((w) => w.id === value),
    [works, value],
  );
  const displayValue = selectedWork
    ? `${selectedWork.titleVi ?? selectedWork.documentCode ?? selectedWork.id.slice(0, 8)}${selectedWork.documentCode ? ` (${selectedWork.documentCode})` : ""}`
    : "";

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }
    if (visibleWorks.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const selectedIndex = visibleWorks.findIndex((w) => w.id === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, visibleWorks, value]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[highlightedIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (work: Work) => {
    onChange(work.id);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (visibleWorks.length === 0) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex((prev) => {
        if (prev < 0) return 0;
        const next = (prev + dir + visibleWorks.length) % visibleWorks.length;
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        const selected = visibleWorks[highlightedIndex];
        if (selected) handleSelect(selected);
      }
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border bg-muted/30 h-10 px-3 py-2 text-sm",
            disabled && "opacity-60 pointer-events-none",
            open && "ring-2 ring-ring ring-offset-2",
          )}
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={open ? search : displayValue}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Xóa"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-64">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                {search.trim()
                  ? "Không tìm thấy tác phẩm."
                  : "Chưa có tác phẩm."}
              </div>
            ) : (
              <ScrollArea className="h-64">
                <ul className="p-1">
                  {visibleWorks.map((w, index) => {
                    const isSelected = value === w.id;
                    const isHighlighted = index === highlightedIndex;
                    const rowLabel = `${w.titleVi ?? w.documentCode ?? w.id.slice(0, 8)}${w.documentCode ? ` (${w.documentCode})` : ""}`;
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(w)}
                          ref={(el) => {
                            itemRefs.current[index] = el;
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                            (isSelected || isHighlighted) && "bg-accent text-accent-foreground",
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1 truncate">
                            {rowLabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filtered.length > 100 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
                    Hiển thị 100 / {filtered.length} — thu hẹp ô tìm kiếm
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
