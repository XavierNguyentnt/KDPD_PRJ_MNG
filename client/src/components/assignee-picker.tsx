import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, normalizeSearch } from "@/lib/utils";
import { Check, ChevronDown, User, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserOption {
  id: string;
  email: string;
  displayName: string;
  department?: string | null;
}

async function fetchUsers(): Promise<UserOption[]> {
  const res = await fetch("/api/users", { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách người dùng");
  const list = await res.json();
  return list.map((u: { id: string; email?: string | null; displayName?: string | null; department?: string | null }) => ({
    id: u.id ?? "",
    email: u.email ?? "",
    displayName: u.displayName ?? "",
    department: u.department ?? null,
  }));
}

interface AssigneePickerProps {
  value: string;           // displayName
  assigneeId?: string | null;
  onChange: (assignee: string, assigneeId: string | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function AssigneePicker({
  value,
  assigneeId,
  onChange,
  disabled,
  label,
  placeholder = "Tìm theo tên hoặc email...",
  className,
  autoFocus,
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: open,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = normalizeSearch(search.trim());
    return users.filter(
      (u) =>
        normalizeSearch(u.displayName ?? "").includes(q) ||
        normalizeSearch(u.email ?? "").includes(q) ||
        (u.department != null && normalizeSearch(String(u.department)).includes(q))
    );
  }, [users, search]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }
    if (filtered.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const selectedIndex = filtered.findIndex(
      (u) => assigneeId === u.id || (value && value === u.displayName),
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, filtered, assigneeId, value]);

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

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const input = containerRef.current?.querySelector('input[type="text"]') as HTMLInputElement | null;
    if (input) {
      input.focus();
    }
  }, [autoFocus, disabled]);

  const handleSelect = (u: UserOption) => {
    onChange(u.displayName, u.id);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", null);
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (filtered.length === 0) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex((prev) => {
        if (prev < 0) return 0;
        const next = (prev + dir + filtered.length) % filtered.length;
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        const selected = filtered[highlightedIndex];
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
            "flex items-center gap-2 rounded-md border bg-muted/30 min-h-9 px-3 py-2 text-sm",
            disabled && "opacity-60 pointer-events-none",
            open && "ring-2 ring-ring ring-offset-2"
          )}
        >
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={open ? search : value}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
            autoFocus={!!autoFocus && !disabled}
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
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-64">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                {search.trim() ? "Không tìm thấy nhân sự." : "Chưa có người dùng."}
              </div>
            ) : (
              <ScrollArea className="h-64">
                <ul className="p-1">
                  {filtered.map((u, index) => {
                    const isSelected = assigneeId === u.id || (value && value === u.displayName);
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(u)}
                          ref={(el) => {
                            itemRefs.current[index] = el;
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                            (isSelected || isHighlighted) && "bg-accent text-accent-foreground"
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{u.displayName}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
