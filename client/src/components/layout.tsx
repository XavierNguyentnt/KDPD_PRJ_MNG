import { Link, useLocation } from "wouter";
import { LayoutDashboard, CheckSquare, Users, Settings, LogOut, ChevronDown, Bell, Languages, Shield, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/hooks/use-tasks";
import { useI18n } from "@/hooks/use-i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { role, setRole, user, logout } = useAuth();
  const displayName = user?.displayName ?? "User";
  const department = user?.department ?? "";
  const { language, setLanguage, t } = useI18n();

  const navItems = [
    { href: "/", label: t.dashboard.title, icon: LayoutDashboard },
    { href: "/cv-chung", label: "CV chung", icon: CheckSquare },
    { href: "/bien-tap", label: "Biên tập", icon: CheckSquare },
    { href: "/thiet-ke-cntt", label: "Thiết kế/CNTT", icon: CheckSquare },
    { href: "/team", label: "Team", icon: Users },
    ...(role === UserRole.ADMIN || role === UserRole.MANAGER
      ? [
          { href: "/admin", label: "Admin", icon: Shield as React.ComponentType<any> },
          { href: "/admin/users", label: "Quản lý người dùng", icon: UserCog },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/50 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <CheckSquare className="w-5 h-5" />
            </div>
            TaskMaster
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              {language === 'vi' ? 'Mô phỏng vai trò' : 'Simulate Role'}
            </p>
            <div className="space-y-1">
              {Object.values(UserRole).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`
                    w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors
                    ${role === r 
                      ? "bg-white text-primary shadow-sm ring-1 ring-border" 
                      : "text-muted-foreground hover:bg-white/50"
                    }
                  `}
                >
                  {r} {language === 'vi' ? 'Xem' : 'View'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <h1 className="text-lg font-display font-semibold text-foreground hidden sm:block">
            {navItems.find(i => i.href === location)?.label || t.dashboard.title}
          </h1>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Languages className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ngôn ngữ / Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setLanguage('vi')}
                  className={language === 'vi' ? 'bg-primary/10 text-primary' : ''}
                >
                  🇻🇳 Tiếng Việt
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')}
                  className={language === 'en' ? 'bg-primary/10 text-primary' : ''}
                >
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
              <Bell className="w-5 h-5" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
            </Button>
            
            <div className="h-6 w-px bg-border/50 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-4 h-auto py-1.5 hover:bg-muted/50 rounded-full">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`} />
                    <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs hidden sm:flex">
                    <span className="font-semibold">{displayName}</span>
                    <span className="text-muted-foreground">{department || role}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  {language === 'vi' ? 'Tài khoản của tôi' : 'My Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <Settings className="w-4 h-4" /> 
                  {language === 'vi' ? 'Cài đặt' : 'Settings'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4" /> 
                  {language === 'vi' ? 'Đăng xuất' : 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-8 space-y-8 animate-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
