import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, normalizeSearch } from "@/lib/utils";
import { Check, ChevronDown, User, X, Plus, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

interface UserOption {
  id: string;
  email: string;
  displayName: string;
  department?: string | null;
}

async function fetchUsers(): Promise<UserOption[]> {
  const res = await fetch(api.users.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách người dùng");
  const list = await res.json();
  return list.map((u: { id: string; email?: string | null; displayName?: string | null; department?: string | null }) => ({
    id: u.id ?? "",
    email: u.email ?? "",
    displayName: u.displayName ?? "",
    department: u.department ?? null,
  }));
}

interface TranslatorPickerProps {
  value: string;           // displayName
  userId?: string | null;
  onChange: (name: string, userId: string | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function TranslatorPicker({
  value,
  userId,
  onChange,
  disabled,
  label,
  placeholder = "Tìm theo tên hoặc email...",
  className,
}: TranslatorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Kiểm tra xem có user nào khớp với search không
  const hasExactMatch = useMemo(() => {
    if (!search.trim()) return true;
    const q = normalizeSearch(search.trim());
    return filtered.some(
      (u) => normalizeSearch(u.displayName ?? "").toLowerCase() === q.toLowerCase()
    );
  }, [filtered, search]);

  const createUserMutation = useMutation({
    mutationFn: async (displayName: string) => {
      // Lấy role "partner"
      const rolesRes = await fetch(api.roles.list.path, { credentials: "include" });
      if (!rolesRes.ok) throw new Error("Không tải được danh sách vai trò");
      const rolesList = await rolesRes.json();
      const partnerRole = rolesList.find((r: { code: string }) => r.code === "partner");
      
      if (!partnerRole) {
        throw new Error("Role 'partner' chưa được tạo. Vui lòng chạy migration SQL trước.");
      }
      
      // Tạo user mới (không có password)
      const email = `partner_${Date.now()}@system.local`;
      const createUserRes = await fetch(api.users.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          displayName: displayName.trim(),
          passwordHash: null,
          isActive: true,
        }),
      });
      
      if (!createUserRes.ok) {
        const err = await createUserRes.json().catch(() => ({}));
        throw new Error((err.message as string) || "Không thể tạo user mới");
      }
      
      const newUser = await createUserRes.json();
      
      // Gán role "partner"
      const updateUserRes = await fetch(
        buildUrl(api.users.update.path, { id: newUser.id }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            roleIds: [partnerRole.id],
          }),
        }
      );
      
      if (!updateUserRes.ok) {
        console.warn("Không thể gán role 'partner' cho user mới");
      }
      
      return newUser;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onChange(newUser.displayName, newUser.id);
      setShowCreateDialog(false);
      setNewUserName("");
      setOpen(false);
      toast({
        title: "Thành công",
        description: `Đã tạo nhân sự mới: ${newUser.displayName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }
    const totalItems = filtered.length + (search.trim() && !hasExactMatch ? 1 : 0);
    if (totalItems === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const selectedIndex = filtered.findIndex(
      (u) => userId === u.id || (value && value === u.displayName),
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, filtered, userId, value, search, hasExactMatch]);

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

  const handleSelect = (u: UserOption) => {
    onChange(u.displayName, u.id);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setNewUserName(search.trim());
    setShowCreateDialog(true);
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
      const totalItems = filtered.length + (search.trim() && !hasExactMatch ? 1 : 0);
      if (totalItems === 0) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex((prev) => {
        if (prev < 0) return 0;
        const next = (prev + dir + totalItems) % totalItems;
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        if (highlightedIndex < filtered.length) {
          const selected = filtered[highlightedIndex];
          if (selected) handleSelect(selected);
        } else if (search.trim() && !hasExactMatch) {
          handleCreateNew();
        }
      }
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const totalItems = filtered.length + (search.trim() && !hasExactMatch ? 1 : 0);

  return (
    <>
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
              ) : totalItems === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {search.trim() ? "Không tìm thấy nhân sự." : "Chưa có người dùng."}
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <ul className="p-1">
                    {filtered.map((u, index) => {
                      const isSelected = userId === u.id || (value && value === u.displayName);
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
                    {search.trim() && !hasExactMatch && (
                      <li>
                        <button
                          type="button"
                          onClick={handleCreateNew}
                          ref={(el) => {
                            itemRefs.current[filtered.length] = el;
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground text-primary",
                            highlightedIndex === filtered.length && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Plus className="h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">Thêm mới: {search.trim()}</div>
                            <div className="text-xs text-muted-foreground">Tạo nhân sự mới với role "Đối tác"</div>
                          </div>
                        </button>
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm nhân sự mới</DialogTitle>
            <DialogDescription>
              Tạo nhân sự mới với role "Đối tác" (không có mật khẩu, chỉ lưu thông tin).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newUserName">Họ tên</Label>
              <Input
                id="newUserName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nhập họ tên"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewUserName("");
              }}
              disabled={createUserMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (newUserName.trim()) {
                  createUserMutation.mutate(newUserName.trim());
                }
              }}
              disabled={!newUserName.trim() || createUserMutation.isPending}
            >
              {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
