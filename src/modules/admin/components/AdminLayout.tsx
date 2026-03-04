import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import type { AppRole } from "@/modules/auth/hooks/useUserRole";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { useTheme, THEMES } from "@/hooks/useTheme";

interface AdminLayoutProps {
  children: React.ReactNode;
  onSwitchRole: (role: AppRole) => void;
}

export function AdminLayout({ children, onSwitchRole }: AdminLayoutProps) {
  const { activeThemeId } = useTheme();
  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="hidden md:block">
          <AdminSidebar onSwitchRole={onSwitchRole} />
        </div>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-card/70 backdrop-blur-xl px-4 md:hidden">
            <div className="relative">
              <div className="absolute inset-0 blur-lg bg-destructive/20 rounded-full scale-150" />
              <FitSoulLogo className="relative h-5 w-auto" color={`hsl(${activeTheme.primary})`} />
            </div>
            <span className="text-[10px] font-black tracking-widest text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full">
              ADMIN
            </span>
          </header>

          <div className="p-4 pb-20 md:p-6 md:pb-6 lg:p-10">{children}</div>
        </main>

        <AdminBottomNav />
      </div>
    </SidebarProvider>
  );
}
