import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError?.();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setForgotLoading(true);
    try {
      const res = await fetch(api.auth.forgotPassword.path, {
        method: api.auth.forgotPassword.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Không thể lấy lại mật khẩu",
          description: data.message ?? "Vui lòng thử lại sau.",
          duration: 7000,
        });
        return;
      }
      toast({
        title: "Đã gửi yêu cầu",
        description:
          data.message ??
          "Nếu email tồn tại trong hệ thống, mật khẩu mới sẽ được gửi đến email đó.",
        duration: 7000,
      });
      setForgotOpen(false);
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>
            Dùng email và mật khẩu tài khoản KDPD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="abc@vnu.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="**********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            <div className="flex items-center justify-end">
              <Dialog
                open={forgotOpen}
                onOpenChange={(open) => {
                  setForgotOpen(open);
                  if (open) setForgotEmail(email.trim());
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-0 h-auto text-primary"
                  >
                    Quên mật khẩu?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Quên mật khẩu</DialogTitle>
                    <DialogDescription>
                      Hệ thống sẽ tạo mật khẩu mới (8 ký tự) và gửi đến email của
                      bạn.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Label htmlFor="forgotEmail">Email</Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="abc@vnu.edu.vn"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoComplete="username"
                      className="bg-background"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForgotOpen(false)}
                      disabled={forgotLoading}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading || !forgotEmail.trim()}
                    >
                      {forgotLoading ? "Đang gửi..." : "Gửi mật khẩu mới"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
