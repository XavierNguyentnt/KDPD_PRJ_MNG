import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Pencil, Check, ChevronsUpDown, Users, UserCheck, UserX, ShieldCheck, Edit3, ClipboardList, UserPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@shared/routes";

/** (roleId, componentId) từ user_roles — dùng cho Thư ký hợp phần + Tên Hợp phần */
interface RoleAssignmentItem {
  roleId: string;
  componentId: string | null;
}

interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  isActive: boolean;
  roles?: RoleItem[];
  groups?: GroupItem[];
  roleAssignments?: RoleAssignmentItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface ComponentItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
}

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface GroupItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

async function fetchUsers(): Promise<ApiUser[]> {
  const res = await fetch("/api/users", { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách người dùng");
  return res.json();
}

async function updateUserPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`/api/users/${userId}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data.message as string) || "Đổi mật khẩu thất bại");
  }
}

type UpdateUserPayload = {
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  isActive?: boolean;
  roleIds?: string[];
  groupIds?: string[];
  /** Ghi đè user_roles theo (roleId, componentId). Dùng khi có Thư ký hợp phần + Tên Hợp phần. */
  roleAssignments?: { roleId: string; componentId: string | null }[];
};
async function updateUser(
  userId: string,
  data: UpdateUserPayload,
): Promise<ApiUser> {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.message as string) || "Cập nhật thông tin thất bại");
  }
  return res.json();
}

export default function AdminUsersPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [passwordDialog, setPasswordDialog] = useState<{
    user: ApiUser;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{ user: ApiUser } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleComboboxOpen, setRoleComboboxOpen] = useState(false);
  const [groupComboboxOpen, setGroupComboboxOpen] = useState(false);
  const [componentComboboxOpen, setComponentComboboxOpen] = useState(false);
  const [editForm, setEditForm] = useState<
    Pick<ApiUser, "displayName" | "firstName" | "lastName" | "department"> & {
      isActive: boolean;
      roleIds: string[];
      groupIds: string[];
      /** Id hợp phần (component_id) cho vai trò Thư ký hợp phần — lưu vào user_roles.component_id */
      componentIds: string[];
    }
  >({
    displayName: "",
    firstName: "",
    lastName: "",
    department: "",
    isActive: true,
    roleIds: [],
    groupIds: [],
    componentIds: [],
  });

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const { data: rolesList = [] } = useQuery<RoleItem[]>({
    queryKey: [api.roles.list.path],
    queryFn: async () => {
      const res = await fetch(api.roles.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách vai trò");
      return res.json();
    },
  });

  const { data: groupsList = [] } = useQuery<GroupItem[]>({
    queryKey: [api.groups.list.path],
    queryFn: async () => {
      const res = await fetch(api.groups.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách nhóm nhân sự");
      return res.json();
    },
  });

  const { data: componentsList = [] } = useQuery<ComponentItem[]>({
    queryKey: [api.components.list.path],
    queryFn: async () => {
      const res = await fetch(api.components.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách hợp phần");
      return res.json();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({
      userId,
      newPassword,
    }: {
      userId: string;
      newPassword: string;
    }) => updateUserPassword(userId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setPasswordDialog(null);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Đã đổi mật khẩu",
        description: "Mật khẩu đã được cập nhật.",
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: Parameters<typeof updateUser>[1];
    }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditDialog(null);
      toast({
        title: "Đã cập nhật",
        description: "Thông tin người dùng đã được lưu vào DB.",
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message });
    },
  });

  const handleSubmitPassword = () => {
    if (!passwordDialog) return;
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu tối thiểu 6 ký tự.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Hai ô mật khẩu không trùng.",
      });
      return;
    }
    passwordMutation.mutate({ userId: passwordDialog.user.id, newPassword });
  };

  const roleThuKyHopPhan = rolesList.find((r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary");
  const groupHopPhanDichThuat = groupsList.find((g) => g.name === "Hợp phần dịch thuật" || g.code === "hop_phan_dich_thuat");

  const openEditDialog = (user: ApiUser) => {
    setEditDialog({ user });
    const roleIds = user.roles?.map((r) => r.id) ?? [];
    const thuKyRole = rolesList.find((r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary");
    const componentIdsFromRole =
      thuKyRole && user.roleAssignments
        ? user.roleAssignments
            .filter((a) => a.roleId === thuKyRole.id && a.componentId)
            .map((a) => a.componentId as string)
        : [];
    setEditForm({
      displayName: user.displayName ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      department: user.department ?? "",
      isActive: user.isActive ?? true,
      roleIds,
      groupIds: user.groups?.map((g) => g.id) ?? [],
      componentIds: componentIdsFromRole,
    });
  };

  const showComponentField =
    !!roleThuKyHopPhan &&
    (editForm.roleIds.includes(roleThuKyHopPhan.id) ||
      (editDialog?.user.groups?.some((g) => g.id === groupHopPhanDichThuat?.id) ?? false));

  const handleSubmitEdit = () => {
    if (!editDialog) return;
    if (!editForm.displayName?.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Họ tên không được để trống.",
      });
      return;
    }
    const roleAssignments =
      roleThuKyHopPhan && showComponentField
        ? editForm.roleIds.flatMap((roleId) => {
            if (roleId === roleThuKyHopPhan.id) {
              return (editForm.componentIds || []).map((componentId) => ({ roleId, componentId }));
            }
            return [{ roleId, componentId: null as string | null }];
          })
        : undefined;
    updateUserMutation.mutate({
      userId: editDialog.user.id,
      data: {
        displayName: editForm.displayName.trim(),
        firstName: editForm.firstName?.trim() || null,
        lastName: editForm.lastName?.trim() || null,
        department: editForm.department?.trim() || null,
        isActive: editForm.isActive,
        ...(roleAssignments !== undefined ? { roleAssignments } : { roleIds: editForm.roleIds }),
        groupIds: editForm.groupIds,
      },
    });
  };

  const isAdminOrManager = role === "Admin" || role === "Manager";

  if (!isAdminOrManager) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Bạn cần quyền Admin hoặc Manager để truy cập trang này.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = (() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const isManagerUser = (u: ApiUser) =>
      (u.roles ?? []).some(
        (r) =>
          r.code?.toLowerCase() === "manager" ||
          r.name === "Manager" ||
          r.name === "Quản lý" ||
          (r.name && (r.name.includes("Trưởng ban") || r.name.includes("Phó trưởng ban"))) ||
          (r.code && (r.code.replace(/\t/g, "").trim() === "tbtk" || r.code.replace(/\t/g, "").trim() === "ptbtk")),
      );
    const isThuKyUser = (u: ApiUser) =>
      (u.roles ?? []).some((r) => r.code === "prj_secretary" || r.name === "Thư ký hợp phần") ||
      (u.groups ?? []).some((g) => g.code === "thu_ky_hop_phan" || g.name === "Thư ký hợp phần");
    const isEditorUser = (u: ApiUser) =>
      (u.roles ?? []).some((r) => r.code === "editor" || r.name === "Biên tập viên") ||
      (u.groups ?? []).some((g) => g.code === "bien_tap" || g.name === "Biên tập");
    const isPartnerUser = (u: ApiUser) =>
      (u.roles ?? []).some((r) => r.code === "partner" || r.name === "Đối tác");
    const managers = users.filter(isManagerUser).length;
    const thuKy = users.filter(isThuKyUser).length;
    const bienTap = users.filter(isEditorUser).length;
    const congTacVien = users.filter(isPartnerUser).length;
    return { total, active, inactive, managers, thuKy, bienTap, congTacVien };
  })();

  const [badgeFilter, setBadgeFilter] = useState<"all" | "active" | "inactive" | "manager" | "secretary" | "editor" | "partner">("all");
  const [search, setSearch] = useState("");

  const filteredUsers = users
    .filter((u) => {
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return (
        (u.email || "").toLowerCase().includes(s) ||
        (u.displayName || "").toLowerCase().includes(s)
      );
    })
    .filter((u) => {
      if (badgeFilter === "all") return true;
      const roles = u.roles ?? [];
      const groups = u.groups ?? [];
      switch (badgeFilter) {
        case "active":
          return u.isActive;
        case "inactive":
          return !u.isActive;
        case "manager":
          return roles.some(
            (r) =>
              r.code?.toLowerCase() === "manager" ||
              r.name === "Manager" ||
              r.name === "Quản lý" ||
              (r.name && (r.name.includes("Trưởng ban") || r.name.includes("Phó trưởng ban"))) ||
              (r.code && (r.code.replace(/\t/g, "").trim() === "tbtk" || r.code.replace(/\t/g, "").trim() === "ptbtk")),
          );
        case "secretary":
          return roles.some((r) => r.code === "prj_secretary" || r.name === "Thư ký hợp phần") ||
            groups.some((g) => g.code === "thu_ky_hop_phan" || g.name === "Thư ký hợp phần");
        case "editor":
          return roles.some((r) => r.code === "editor" || r.name === "Biên tập viên") ||
            groups.some((g) => g.code === "bien_tap" || g.name === "Biên tập");
        case "partner":
          return roles.some((r) => r.code === "partner" || r.name === "Đối tác");
        default:
          return true;
      }
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "all" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("all")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/60">
                <Users className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Tổng người dùng</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.total}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "active" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("active")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-200/60">
                <UserCheck className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Đang hoạt động</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.active}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "inactive" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("inactive")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-200/60">
                <UserX className="h-6 w-6 text-rose-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Không hoạt động</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.inactive}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "manager" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("manager")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-200/60">
                <ShieldCheck className="h-6 w-6 text-indigo-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Quản lý</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.managers}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "secretary" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("secretary")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-200/60">
                <ClipboardList className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Thư ký hợp phần</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.thuKy}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "editor" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("editor")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-200/60">
                <Edit3 className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Biên tập viên</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.bienTap}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "partner" ? "ring-2 ring-primary/30" : ""}`} onClick={() => setBadgeFilter("partner")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-200/60">
                <UserPlus className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Cộng tác viên</p>
                <h3 className="text-2xl font-bold tabular-nums">{stats.congTacVien}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="pl-8 h-9 bg-background"
          />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quản lý người dùng</CardTitle>
          <CardDescription>
            Xem danh sách người dùng và đổi mật khẩu. Chỉ Admin/Manager mới thấy
            trang này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Đang tải...
            </div>
          )}
          {error && (
            <p className="text-destructive py-4">{(error as Error).message}</p>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Nhóm nhân sự</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>{u.department ?? "—"}</TableCell>
                    <TableCell>
                      {u.roles?.map((r) => r.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {u.groups?.map((g) => g.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{u.isActive ? "Hoạt động" : "Tắt"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(u)}
                        className="gap-1">
                        <Pencil className="w-3.5 h-3.5" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPasswordDialog({ user: u });
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        className="gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        Đổi mật khẩu
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!passwordDialog}
        onOpenChange={(open) => !open && setPasswordDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              {passwordDialog
                ? `Đặt mật khẩu mới cho ${passwordDialog.user.displayName} (${passwordDialog.user.email}).`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {passwordDialog && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog(null)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmitPassword}
              disabled={
                passwordMutation.isPending ||
                !newPassword ||
                newPassword !== confirmPassword
              }>
              {passwordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu mật khẩu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editDialog}
        onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa thông tin người dùng</DialogTitle>
            <DialogDescription>
              {editDialog
                ? `Cập nhật thông tin cho ${editDialog.user.email}. Thay đổi sẽ được ghi vào bảng users.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editDialog && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-displayName">Họ tên (hiển thị) *</Label>
                <Input
                  id="edit-displayName"
                  value={editForm.displayName ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstName">Tên</Label>
                  <Input
                    id="edit-firstName"
                    value={editForm.firstName ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    placeholder="Văn A"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastName">Họ</Label>
                  <Input
                    id="edit-lastName"
                    value={editForm.lastName ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    placeholder="Nguyễn"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-department">Phòng ban</Label>
                <Input
                  id="edit-department"
                  value={editForm.department ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, department: e.target.value }))
                  }
                  placeholder="Ban Thư ký"
                />
              </div>
              <div className="grid gap-2">
                <Label>Vai trò (nhiều)</Label>
                <Popover
                  open={roleComboboxOpen}
                  onOpenChange={setRoleComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={roleComboboxOpen}
                      className="w-full justify-between font-normal min-h-9 h-auto py-2 text-left">
                      <span className="flex-1 min-w-0 break-words whitespace-normal mr-2">
                        {editForm.roleIds.length
                          ? editForm.roleIds
                              .map(
                                (id) =>
                                  rolesList.find((r) => r.id === id)?.name,
                              )
                              .filter(Boolean)
                              .join(", ")
                          : "Chọn vai trò..."}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start">
                    <Command>
                      <CommandInput placeholder="Tìm vai trò..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy vai trò.</CommandEmpty>
                        <CommandGroup>
                          {rolesList.map((r) => {
                            const selected = editForm.roleIds.includes(r.id);
                            return (
                              <CommandItem
                                key={r.id}
                                value={r.name}
                                onSelect={() => {
                                  setEditForm((f) => ({
                                    ...f,
                                    roleIds: selected
                                      ? f.roleIds.filter((id) => id !== r.id)
                                      : [...f.roleIds, r.id],
                                  }));
                                }}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selected ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {r.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Nhóm nhân sự (nhiều)</Label>
                <Popover
                  open={groupComboboxOpen}
                  onOpenChange={setGroupComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={groupComboboxOpen}
                      className="w-full justify-between font-normal min-h-9 h-auto py-2 text-left">
                      <span className="flex-1 min-w-0 break-words whitespace-normal mr-2">
                        {editForm.groupIds.length
                          ? editForm.groupIds
                              .map(
                                (id) =>
                                  groupsList.find((g) => g.id === id)?.name,
                              )
                              .filter(Boolean)
                              .join(", ")
                          : "Chọn nhóm nhân sự..."}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start">
                    <Command>
                      <CommandInput placeholder="Tìm nhóm nhân sự..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy nhóm.</CommandEmpty>
                        <CommandGroup>
                          {groupsList.map((g) => {
                            const selected = editForm.groupIds.includes(g.id);
                            return (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => {
                                  setEditForm((f) => ({
                                    ...f,
                                    groupIds: selected
                                      ? f.groupIds.filter((id) => id !== g.id)
                                      : [...f.groupIds, g.id],
                                  }));
                                }}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selected ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {g.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {showComponentField && (
                <div className="grid gap-2">
                  <Label>Tên Hợp phần (nhiều — lưu vào user_roles.component_id)</Label>
                  <Popover
                    open={componentComboboxOpen}
                    onOpenChange={setComponentComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={componentComboboxOpen}
                        className="w-full justify-between font-normal min-h-9 h-auto py-2 text-left">
                        <span className="flex-1 min-w-0 break-words whitespace-normal mr-2">
                          {(editForm.componentIds?.length ?? 0) > 0
                            ? (editForm.componentIds ?? [])
                                .map(
                                  (id) =>
                                    componentsList.find((c) => c.id === id)?.name,
                                )
                                .filter(Boolean)
                                .join(", ")
                            : "Chọn hợp phần..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start">
                      <Command>
                        <CommandInput placeholder="Tìm hợp phần..." />
                        <CommandList>
                          <CommandEmpty>Không tìm thấy hợp phần.</CommandEmpty>
                          <CommandGroup>
                            {componentsList.map((c) => {
                              const selected = (editForm.componentIds ?? []).includes(c.id);
                              return (
                                <CommandItem
                                  key={c.id}
                                  value={c.name}
                                  onSelect={() => {
                                    setEditForm((f) => ({
                                      ...f,
                                      componentIds: selected
                                        ? (f.componentIds ?? []).filter((id) => id !== c.id)
                                        : [...(f.componentIds ?? []), c.id],
                                    }));
                                  }}>
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selected ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {c.name}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="rounded border-input"
                />
                <Label htmlFor="edit-isActive">Tài khoản hoạt động</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={
                updateUserMutation.isPending || !editForm.displayName?.trim()
              }>
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu vào DB"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
