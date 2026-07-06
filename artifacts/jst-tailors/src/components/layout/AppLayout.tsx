import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Users, Scissors, CreditCard, FileText, Settings, LogOut, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useGetSettings } from "@workspace/api-client-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Orders", href: "/orders", icon: Scissors },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const fallbackLogo = `${basePath}/logo-monogram.png`;

function SidebarLogo({ logoSrc, size = "lg" }: { logoSrc: string; size?: "sm" | "lg" }) {
  if (size === "lg") {
    return (
      <Link href="/" className="flex flex-col items-center gap-3">
        <div className="h-24 w-24 rounded-2xl bg-white flex items-center justify-center shadow-xl p-1.5">
          <img
            src={logoSrc}
            alt="Shop Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-[10px] tracking-[0.25em] text-sidebar-foreground/50 uppercase font-medium">
          Tailor Manager · Since 1980
        </p>
      </Link>
    );
  }
  return (
    <Link href="/" className="flex items-center justify-center">
      <div className="flex items-center justify-center bg-white rounded-xl shadow-sm p-0.5">
        <img
          src={logoSrc}
          alt="Shop Logo"
          className="h-7 w-7 object-contain"
        />
      </div>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const username = import.meta.env.VITE_AUTH_USERNAME || "admin";
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fetch settings to get the dynamic shop logo
  const { data: settings } = useGetSettings();
  const logoSrc = settings?.shopLogo || fallbackLogo;

  useEffect(() => {
    setMounted(true);
  }, []);

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-sm ${
              isActive
                ? "bg-primary text-white font-semibold shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-sidebar md:block">
        <div className="flex h-full max-h-screen flex-col">
          {/* Logo */}
          <div className="flex h-36 items-center justify-center border-b border-sidebar-border px-5">
            <SidebarLogo logoSrc={logoSrc} size="lg" />
          </div>
          {/* Nav */}
          <div className="flex-1 overflow-auto py-4">
            <nav className="grid items-start px-3 text-sm font-medium gap-0.5">
              <NavLinks />
            </nav>
          </div>
          {/* User + Logout */}
          <div className="mt-auto p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">
                  {username}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-0">
              <div className="flex h-36 items-center justify-center border-b border-sidebar-border px-5">
                <SidebarLogo logoSrc={logoSrc} size="lg" />
              </div>
              <nav className="grid gap-0.5 p-3 mt-2 text-sm font-medium">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>

          {/* Header logo (mobile) */}
          <div className="flex items-center gap-2 md:hidden">
            <SidebarLogo logoSrc={logoSrc} size="sm" />
          </div>

          <div className="flex w-full items-center justify-end gap-2 md:ml-auto">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="rounded-full"
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
