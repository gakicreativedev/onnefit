import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  HomeBold,
  ChefHatBold,
  DumbbellBold,
  BookBold,
  SettingsBold,
  Logout3Bold,
  TransferHorizontalBold,
  VerifiedCheckBold,
  CupBold,
  ChartBold,
} from "solar-icon-set";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { AppRole } from "@/modules/auth/hooks/useUserRole";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { useTheme, THEMES } from "@/hooks/useTheme";

const adminNav = [
  { title: "painel", url: "/admin", icon: HomeBold },
  { title: "receitas", url: "/admin/recipes", icon: ChefHatBold },
  { title: "treinos", url: "/admin/workouts", icon: DumbbellBold },
  { title: "posts", url: "/admin/updates", icon: BookBold },
  { title: "verificação", url: "/admin/users", icon: VerifiedCheckBold },
  { title: "grupos", url: "/admin/groups", icon: CupBold },
  { title: "analytics", url: "/admin/analytics", icon: ChartBold },
];

interface AdminSidebarProps {
  onSwitchRole: (role: AppRole) => void;
}

export function AdminSidebar({ onSwitchRole }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { activeThemeId } = useTheme();
  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="flex items-center justify-center pt-8 pb-6 px-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-destructive/15 rounded-full scale-150" />
          <FitSoulLogo className="relative h-10 w-auto" color={`hsl(${activeTheme.primary})`} />
        </div>
        <span className="mt-3 text-[10px] font-black tracking-widest text-destructive bg-destructive/10 px-3 py-1 rounded-full">
          ADMIN
        </span>
      </SidebarHeader>

      <SidebarContent className="flex justify-center px-4">
        <nav className="flex flex-col gap-1 w-[170px] mx-auto">
          {adminNav.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/admin"}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 w-full"
              activeClassName="!bg-primary/15 !text-primary glow-primary-sm"
            >
              <item.icon size={18} color="currentColor" />
              <span className="capitalize">{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-6 pt-4 space-y-1.5">
        <button
          onClick={() => onSwitchRole("professional")}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <TransferHorizontalBold size={16} color="currentColor" />
          <span>Modo Personal</span>
        </button>
        <button
          onClick={() => onSwitchRole("athlete")}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <TransferHorizontalBold size={16} color="currentColor" />
          <span>Modo Atleta</span>
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-primary/80 hover:text-primary hover:bg-primary/10 transition-all"
        >
          <SettingsBold size={16} color="currentColor" />
          <span>Configurações</span>
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Logout3Bold size={16} color="currentColor" />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
