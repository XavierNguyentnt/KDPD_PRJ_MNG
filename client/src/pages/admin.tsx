import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserCog } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>
            Dữ liệu tasks, users, contracts, documents được lưu trên Neon (PostgreSQL). Không còn dùng Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Tasks: đọc/ghi trực tiếp từ bảng <code className="px-1 py-0.5 rounded bg-muted text-xs">tasks</code> trong DB.</li>
            <li>Users, contracts, documents: CRUD qua API với <code className="px-1 py-0.5 rounded bg-muted text-xs">DATABASE_URL</code> trong <code className="px-1 py-0.5 rounded bg-muted text-xs">.env</code>.</li>
            <li>Cấu hình DB: xem <code className="px-1 py-0.5 rounded bg-muted text-xs">Docs/NEON_SETUP.md</code>.</li>
          </ul>
          <div className="pt-2">
            <Link href="/admin/users">
              <Button variant="outline" className="gap-2">
                <UserCog className="w-4 h-4" />
                Quản lý người dùng (đổi mật khẩu)
              </Button>
            </Link>
          </div>
          {user && (
            <p className="text-sm text-muted-foreground">
              Đăng nhập với tài khoản: <strong>{user.displayName}</strong> ({user.email}), role: <strong>{user.role ?? "—"}</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
