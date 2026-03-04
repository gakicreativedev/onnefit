import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { useTheme, THEMES } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
  profile: Profile | null;
  onProfileUpdate?: () => void;
}

export function AppLayout({ children, profile, onProfileUpdate }: AppLayoutProps) {
  const navigate = useNavigate();
  const { activeThemeId } = useTheme();
  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];
  const displayName = profile?.name || "A";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar profile={profile} onProfileUpdate={onProfileUpdate} />
        </div>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {/* Mobile top bar — premium glassmorphism */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-card/85 backdrop-blur-xl px-4 md:hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <FitSoulLogo className="h-5 w-auto" color={`hsl(${activeTheme.primary})`} />
            <button
              onClick={() => navigate("/profile")}
              className="relative h-9 w-9 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-primary/40 hover:ring-primary/70 transition-all hover:scale-105 active:scale-95"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
              )}
              {/* Online indicator dot */}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
            </button>
          </header>

          {/* Page content — bottom padding for mobile nav */}
          <div className="p-4 pb-24 md:p-6 md:pb-6 lg:p-10">{children}</div>
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
