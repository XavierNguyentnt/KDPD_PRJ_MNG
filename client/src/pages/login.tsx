import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, BookOpen, Quote, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <main role="main" aria-label="Đăng nhập" className="min-h-[100dvh] w-full bg-background flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-primary via-primary/92 to-accent text-white">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--secondary)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--secondary)) 0%, transparent 45%), radial-gradient(circle at 50% 100%, hsl(var(--accent)/0.4) 0%, transparent 50%)",
          }}
        />
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-16 w-full h-full min-h-[100dvh]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <BookOpen className="w-7 h-7 text-secondary" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                KDPD
              </span>
              <span className="text-xs text-white/70 font-medium tracking-wide uppercase">
                Kinh điển phương Đông
              </span>
            </div>
          </div>

          <div className="max-w-md space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 text-xs font-medium text-secondary/95">
                <Sparkles className="w-3.5 h-3.5" />
                Nền tảng số hóa di sản văn hóa
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                Văn phòng Dự án
                <br />
                <span className="text-secondary drop-shadow-sm">
                  Kinh điển phương Đông
                </span>
              </h1>
              <p className="text-lg text-white/85 leading-relaxed font-light">
                Dịch thuật và phát huy một cách toàn diện, có hệ thống giá trị tinh hoa các tác phẩm kinh điển phương Đông.
              </p>
            </div>

            <figure className="relative pl-5 py-1 border-l-2 border-secondary/60">
              <Quote className="absolute -top-2 -left-3 w-7 h-7 text-secondary/40" strokeWidth={1.8} />
              <blockquote className="text-base italic text-white/80 leading-relaxed">
                "Truyền tải ngàn năm văn hiến, kiến tạo tương lai cùng di sản."
              </blockquote>
              <figcaption className="mt-3 text-sm text-secondary/85 font-medium">
                — Sứ mệnh KDPD
              </figcaption>
            </figure>
          </div>

          <div className="flex items-center justify-between text-xs text-white/60 font-medium">
            <span>© {new Date().getFullYear()} KDPD · All rights reserved</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white/90 transition-colors">
                Chính sách bảo mật
              </a>
              <a href="#" className="hover:text-white/90 transition-colors">
                Điều khoản sử dụng
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-background">
        <Card className="w-full max-w-md shadow-xl border-border/80 bg-card animate-in">
          <CardHeader className="space-y-1 pb-2">
            <div className="md:hidden flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" strokeWidth={2.2} />
              </div>
              <span className="font-[family-name:var(--font-display)] font-bold text-lg tracking-tight">
                KDPD
              </span>
            </div>
            <CardTitle className="text-2xl font-[family-name:var(--font-display)] tracking-tight">
              Chào mừng trở lại
            </CardTitle>
            <CardDescription>
              Đăng nhập bằng email tài khoản KDPD của bạn để tiếp tục.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="abc@vnu.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="bg-background h-10"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Mật khẩu
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="**********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-background pr-10 h-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
                  >
                    Ghi nhớ đăng nhập
                  </label>
                </div>
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
                      className="px-0 h-auto text-primary hover:text-primary/80 font-medium"
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

              <Button
                type="submit"
                className="w-full h-10 font-medium"
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>

              <div className="pt-2 text-center text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <a
                  href="#"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Đăng ký mới
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
