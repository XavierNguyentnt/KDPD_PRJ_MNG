import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  KeyRound,
  Loader2,
  Pencil,
  Check,
  Eye,
  EyeOff,
  ChevronsUpDown,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Edit3,
  ClipboardList,
  UserPlus,
  Search,
} from "lucide-react";
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

type CreateUserPayload = {
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  isActive?: boolean;
};

async function createUser(data: CreateUserPayload): Promise<ApiUser> {
  const res = await fetch(api.users.create.path, {
    method: api.users.create.method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.message as string) || "Tạo người dùng thất bại");
  }
  return res.json();
}

function getPasswordRequirementState(password: string) {
  const lengthOk = password.length >= 8;
  const upperOk = /[A-Z]/.test(password);
  const lowerOk = /[a-z]/.test(password);
  const numberOk = /[0-9]/.test(password);
  const specialOk = /[^A-Za-z0-9]/.test(password);
  const ok = lengthOk && upperOk && lowerOk && numberOk && specialOk;
  return { ok, lengthOk, upperOk, lowerOk, numberOk, specialOk };
}

export default function AdminUsersPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [passwordDialog, setPasswordDialog] = useState<{
    user: ApiUser;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{ user: ApiUser } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleComboboxOpen, setRoleComboboxOpen] = useState(false);
  const [groupComboboxOpen, setGroupComboboxOpen] = useState(false);
  const [componentComboboxOpen, setComponentComboboxOpen] = useState(false);
  const [createRoleComboboxOpen, setCreateRoleComboboxOpen] = useState(false);
  const [createGroupComboboxOpen, setCreateGroupComboboxOpen] = useState(false);
  const [createComponentComboboxOpen, setCreateComponentComboboxOpen] =
    useState(false);
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
  const [createForm, setCreateForm] = useState<
    Pick<
      ApiUser,
      "email" | "displayName" | "firstName" | "lastName" | "department"
    > & {
      isActive: boolean;
      roleIds: string[];
      groupIds: string[];
      componentIds: string[];
    }
  >({
    email: "",
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
      const res = await fetch(api.components.list.path, {
        credentials: "include",
      });
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

  const createUserMutation = useMutation({
    mutationFn: async (input: {
      user: CreateUserPayload;
      roleIds: string[];
      groupIds: string[];
      roleAssignments?: { roleId: string; componentId: string | null }[];
    }) => {
      const created = await createUser(input.user);
      if (input.roleAssignments) {
        await updateUser(created.id, {
          roleAssignments: input.roleAssignments,
          groupIds: input.groupIds,
        });
      } else if (input.roleIds.length || input.groupIds.length) {
        await updateUser(created.id, {
          roleIds: input.roleIds,
          groupIds: input.groupIds,
        });
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateDialogOpen(false);
      setCreateForm({
        email: "",
        displayName: "",
        firstName: "",
        lastName: "",
        department: "",
        isActive: true,
        roleIds: [],
        groupIds: [],
        componentIds: [],
      });
      toast({
        title: "Đã thêm người dùng",
        description: "Người dùng mới đã được tạo trong DB.",
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message });
    },
  });

  const handleSubmitPassword = () => {
    if (!passwordDialog) return;
    const req = getPasswordRequirementState(newPassword);
    if (!req.ok) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
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

  const roleThuKyHopPhan = rolesList.find(
    (r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary",
  );
  const groupHopPhanDichThuat = groupsList.find(
    (g) => g.name === "Hợp phần dịch thuật" || g.code === "hop_phan_dich_thuat",
  );

  const openEditDialog = (user: ApiUser) => {
    setEditDialog({ user });
    const roleIds = user.roles?.map((r) => r.id) ?? [];
    const thuKyRole = rolesList.find(
      (r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary",
    );
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
      (editDialog?.user.groups?.some(
        (g) => g.id === groupHopPhanDichThuat?.id,
      ) ??
        false));

  const showCreateComponentField =
    !!roleThuKyHopPhan &&
    (createForm.roleIds.includes(roleThuKyHopPhan.id) ||
      (!!groupHopPhanDichThuat &&
        createForm.groupIds.includes(groupHopPhanDichThuat.id)));

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
              return (editForm.componentIds || []).map((componentId) => ({
                roleId,
                componentId,
              }));
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
        ...(roleAssignments !== undefined
          ? { roleAssignments }
          : { roleIds: editForm.roleIds }),
        groupIds: editForm.groupIds,
      },
    });
  };

  const handleSubmitCreate = () => {
    const email = createForm.email.trim().toLowerCase();
    const displayName = createForm.displayName.trim();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Email không được để trống.",
      });
      return;
    }
    if (!displayName) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Họ tên không được để trống.",
      });
      return;
    }

    const roleAssignments =
      roleThuKyHopPhan && showCreateComponentField
        ? createForm.roleIds.flatMap((roleId) => {
            if (roleId === roleThuKyHopPhan.id) {
              return (createForm.componentIds || []).map((componentId) => ({
                roleId,
                componentId,
              }));
            }
            return [{ roleId, componentId: null as string | null }];
          })
        : undefined;

    createUserMutation.mutate({
      user: {
        email,
        displayName,
        firstName: createForm.firstName?.trim() || null,
        lastName: createForm.lastName?.trim() || null,
        department: createForm.department?.trim() || null,
        isActive: createForm.isActive,
      },
      roleIds: createForm.roleIds,
      groupIds: createForm.groupIds,
      ...(roleAssignments !== undefined ? { roleAssignments } : {}),
    });
  };

  const isAdminOrManager = role === "Admin";

  if (!isAdminOrManager) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Bạn cần quyền Admin để truy cập trang này.
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
          (r.name &&
            (r.name.includes("Trưởng ban") ||
              r.name.includes("Phó trưởng ban"))) ||
          (r.code &&
            (r.code.replace(/\t/g, "").trim() === "tbtk" ||
              r.code.replace(/\t/g, "").trim() === "ptbtk")),
      );
    const isThuKyUser = (u: ApiUser) =>
      (u.roles ?? []).some(
        (r) => r.code === "prj_secretary" || r.name === "Thư ký hợp phần",
      ) ||
      (u.groups ?? []).some(
        (g) => g.code === "thu_ky_hop_phan" || g.name === "Thư ký hợp phần",
      );
    const isEditorUser = (u: ApiUser) =>
      (u.roles ?? []).some(
        (r) => r.code === "editor" || r.name === "Biên tập viên",
      ) ||
      (u.groups ?? []).some(
        (g) => g.code === "bien_tap" || g.name === "Biên tập",
      );
    const isPartnerUser = (u: ApiUser) =>
      (u.roles ?? []).some((r) => r.code === "partner" || r.name === "Đối tác");
    const managers = users.filter(isManagerUser).length;
    const thuKy = users.filter(isThuKyUser).length;
    const bienTap = users.filter(isEditorUser).length;
    const congTacVien = users.filter(isPartnerUser).length;
    return { total, active, inactive, managers, thuKy, bienTap, congTacVien };
  })();

  const [badgeFilter, setBadgeFilter] = useState<
    | "all"
    | "active"
    | "inactive"
    | "manager"
    | "secretary"
    | "editor"
    | "partner"
  >("all");
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
              (r.name &&
                (r.name.includes("Trưởng ban") ||
                  r.name.includes("Phó trưởng ban"))) ||
              (r.code &&
                (r.code.replace(/\t/g, "").trim() === "tbtk" ||
                  r.code.replace(/\t/g, "").trim() === "ptbtk")),
          );
        case "secretary":
          return (
            roles.some(
              (r) => r.code === "prj_secretary" || r.name === "Thư ký hợp phần",
            ) ||
            groups.some(
              (g) =>
                g.code === "thu_ky_hop_phan" || g.name === "Thư ký hợp phần",
            )
          );
        case "editor":
          return (
            roles.some(
              (r) => r.code === "editor" || r.name === "Biên tập viên",
            ) ||
            groups.some((g) => g.code === "bien_tap" || g.name === "Biên tập")
          );
        case "partner":
          return roles.some(
            (r) => r.code === "partner" || r.name === "Đối tác",
          );
        default:
          return true;
      }
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "all" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("all")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/60">
                <Users className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Tổng người dùng
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.total}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "active" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("active")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-200/60">
                <UserCheck className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Đang hoạt động
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.active}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "inactive" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("inactive")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-200/60">
                <UserX className="h-6 w-6 text-rose-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Không hoạt động
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.inactive}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "manager" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("manager")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-200/60">
                <ShieldCheck className="h-6 w-6 text-indigo-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Quản lý
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.managers}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "secretary" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("secretary")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-200/60">
                <ClipboardList className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Thư ký hợp phần
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.thuKy}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "editor" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("editor")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-200/60">
                <Edit3 className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Biên tập viên
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.bienTap}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`overflow-hidden border border-border/50 shadow-sm cursor-pointer ${badgeFilter === "partner" ? "ring-2 ring-primary/30" : ""}`}
            onClick={() => setBadgeFilter("partner")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-200/60">
                <UserPlus className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                  Cộng tác viên
                </p>
                <h3 className="text-2xl font-bold tabular-nums">
                  {stats.congTacVien}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="pl-8 h-9 bg-background"
            />
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setCreateDialogOpen(true);
              setCreateForm({
                email: "",
                displayName: "",
                firstName: "",
                lastName: "",
                department: "",
                isActive: true,
                roleIds: [],
                groupIds: [],
                componentIds: [],
              });
            }}>
            <UserPlus className="h-4 w-4" />
            Thêm người dùng
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quản lý người dùng</CardTitle>
          <CardDescription>
            Xem danh sách người dùng, thêm mới và đổi mật khẩu. Chỉ
            Admin/Manager mới thấy trang này.
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
            <>
              {isMobile ? (
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {u.displayName || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground break-words">
                            {u.email}
                          </div>
                        </div>
                        <Badge
                          variant={u.isActive ? "secondary" : "outline"}
                          className={cn(
                            "shrink-0",
                            u.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-muted-foreground",
                          )}>
                          {u.isActive ? "Hoạt động" : "Tắt"}
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <div className="grid gap-0.5">
                          <div className="text-[11px] text-muted-foreground">
                            Phòng ban
                          </div>
                          <div className="text-sm break-words">
                            {u.department ?? "—"}
                          </div>
                        </div>
                        <div className="grid gap-0.5">
                          <div className="text-[11px] text-muted-foreground">
                            Vai trò
                          </div>
                          <div className="text-sm break-words">
                            {u.roles?.map((r) => r.name).join(", ") || "—"}
                          </div>
                        </div>
                        <div className="grid gap-0.5">
                          <div className="text-[11px] text-muted-foreground">
                            Nhóm nhân sự
                          </div>
                          <div className="text-sm break-words">
                            {u.groups?.map((g) => g.name).join(", ") || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(u)}
                          className="w-full gap-1.5">
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
                            setShowNewPassword(false);
                            setShowConfirmPassword(false);
                          }}
                          className="w-full gap-1.5">
                          <KeyRound className="w-3.5 h-3.5" />
                          Đổi mật khẩu
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
                        <TableCell>
                          {u.isActive ? "Hoạt động" : "Tắt"}
                        </TableCell>
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
            <DialogDescription>
              Tạo nhân sự mới trong bảng users (DB).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                value={createForm.email ?? ""}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="ten@donvi.vn"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-displayName">Họ tên (hiển thị) *</Label>
              <Input
                id="create-displayName"
                value={createForm.displayName ?? ""}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, displayName: e.target.value }))
                }
                placeholder="Ví dụ: Nguyễn Văn A"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="create-firstName">Tên</Label>
                <Input
                  id="create-firstName"
                  value={createForm.firstName ?? ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  placeholder="Văn A"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-lastName">Họ</Label>
                <Input
                  id="create-lastName"
                  value={createForm.lastName ?? ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  placeholder="Nguyễn"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-department">Phòng ban</Label>
              <Input
                id="create-department"
                value={createForm.department ?? ""}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, department: e.target.value }))
                }
                placeholder="Ban Thư ký"
              />
            </div>
            <div className="grid gap-2">
              <Label>Vai trò (nhiều)</Label>
              <Popover
                open={createRoleComboboxOpen}
                onOpenChange={setCreateRoleComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={createRoleComboboxOpen}
                    className="w-full justify-between font-normal min-h-9 h-auto py-2 text-left">
                    <span className="flex-1 min-w-0 break-words whitespace-normal mr-2">
                      {createForm.roleIds.length
                        ? createForm.roleIds
                            .map(
                              (id) => rolesList.find((r) => r.id === id)?.name,
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
                          const selected = createForm.roleIds.includes(r.id);
                          return (
                            <CommandItem
                              key={r.id}
                              value={r.name}
                              onSelect={() => {
                                setCreateForm((f) => ({
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
                open={createGroupComboboxOpen}
                onOpenChange={setCreateGroupComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={createGroupComboboxOpen}
                    className="w-full justify-between font-normal min-h-9 h-auto py-2 text-left">
                    <span className="flex-1 min-w-0 break-words whitespace-normal mr-2">
                      {createForm.groupIds.length
                        ? createForm.groupIds
                            .map(
                              (id) => groupsList.find((g) => g.id === id)?.name,
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
                          const selected = createForm.groupIds.includes(g.id);
                          return (
                            <CommandItem
                              key={g.id}
                              value={g.name}
                              onSelect={() => {
                                setCreateForm((f) => ({
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
            {showCreateComponentField && (
              <div className="grid gap-2">
                <Label>
                  Tên Hợp phần (nhiều — lưu vào user_roles.component_id)
                </Label>
                <Popover
                  open={createComponentComboboxOpen}
                  onOpenChange={setCreateComponentComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={createComponentComboboxOpen}
                      className="w-full justify-between font-normal min-h-9 h-auto py-2 text-left">
                      <span className="flex-1 min-w-0 break-words whitespace-normal mr-2">
                        {(createForm.componentIds?.length ?? 0) > 0
                          ? (createForm.componentIds ?? [])
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
                            const selected = (
                              createForm.componentIds ?? []
                            ).includes(c.id);
                            return (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  setCreateForm((f) => ({
                                    ...f,
                                    componentIds: selected
                                      ? (f.componentIds ?? []).filter(
                                          (id) => id !== c.id,
                                        )
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
                id="create-isActive"
                checked={createForm.isActive}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="rounded border-input"
              />
              <Label htmlFor="create-isActive">Tài khoản hoạt động</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={
                createUserMutation.isPending ||
                !createForm.email?.trim() ||
                !createForm.displayName?.trim()
              }>
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo người dùng"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  Mật khẩu mới
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {(() => {
                  const req = getPasswordRequirementState(newPassword);
                  const Item = ({
                    ok,
                    label,
                  }: {
                    ok: boolean;
                    label: string;
                  }) => (
                    <div
                      className={`text-xs ${ok ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {ok ? "✓" : "•"} {label}
                    </div>
                  );
                  return (
                    <div className="grid gap-1">
                      <div className="text-xs font-medium">Yêu cầu mật khẩu</div>
                      <Item ok={req.lengthOk} label="Tối thiểu 8 ký tự" />
                      <Item ok={req.upperOk} label="Có chữ hoa (A-Z)" />
                      <Item ok={req.lowerOk} label="Có chữ thường (a-z)" />
                      <Item ok={req.numberOk} label="Có số (0-9)" />
                      <Item ok={req.specialOk} label="Có ký tự đặc biệt" />
                    </div>
                  );
                })()}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                    }
                    title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
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
                newPassword !== confirmPassword ||
                !getPasswordRequirementState(newPassword).ok
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
                  <Label>
                    Tên Hợp phần (nhiều — lưu vào user_roles.component_id)
                  </Label>
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
                                    componentsList.find((c) => c.id === id)
                                      ?.name,
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
                              const selected = (
                                editForm.componentIds ?? []
                              ).includes(c.id);
                              return (
                                <CommandItem
                                  key={c.id}
                                  value={c.name}
                                  onSelect={() => {
                                    setEditForm((f) => ({
                                      ...f,
                                      componentIds: selected
                                        ? (f.componentIds ?? []).filter(
                                            (id) => id !== c.id,
                                          )
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
