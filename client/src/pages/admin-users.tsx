import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";

interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  role?: string | null;
  employeeGroup?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

async function fetchUsers(): Promise<ApiUser[]> {
  const res = await fetch("/api/users", { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách người dùng");
  return res.json();
}

async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
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

export default function AdminUsersPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [passwordDialog, setPasswordDialog] = useState<{ user: ApiUser } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const passwordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      updateUserPassword(userId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setPasswordDialog(null);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Đã đổi mật khẩu", description: "Mật khẩu đã được cập nhật." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: err.message });
    },
  });

  const handleSubmitPassword = () => {
    if (!passwordDialog) return;
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Lỗi", description: "Mật khẩu tối thiểu 6 ký tự." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Lỗi", description: "Hai ô mật khẩu không trùng." });
      return;
    }
    passwordMutation.mutate({ userId: passwordDialog.user.id, newPassword });
  };

  const isAdminOrManager = role === "Admin" || role === "Manager";

  if (!isAdminOrManager) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Bạn cần quyền Admin hoặc Manager để truy cập trang này.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quản lý người dùng</CardTitle>
          <CardDescription>
            Xem danh sách người dùng và đổi mật khẩu. Chỉ Admin/Manager mới thấy trang này.
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
            <p className="text-destructive py-4">
              {(error as Error).message}
            </p>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>{u.department ?? "—"}</TableCell>
                    <TableCell>{u.role ?? "—"}</TableCell>
                    <TableCell>{u.isActive ? "Hoạt động" : "Tắt"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPasswordDialog({ user: u });
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        className="gap-1"
                      >
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

      <Dialog open={!!passwordDialog} onOpenChange={(open) => !open && setPasswordDialog(null)}>
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
                <Label htmlFor="newPassword">Mật khẩu mới (tối thiểu 6 ký tự)</Label>
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
              disabled={passwordMutation.isPending || !newPassword || newPassword !== confirmPassword}
            >
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
    </div>
  );
}
