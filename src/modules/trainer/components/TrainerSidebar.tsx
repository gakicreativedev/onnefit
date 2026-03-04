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
  UsersGroupTwoRoundedBold,
  DumbbellBold,
  ChatRoundBold,
  ChartBold,
  SettingsBold,
  Logout3Bold,
  TransferHorizontalBold,
  ChefHatBold,
  RulerAngularBold,
  CupBold,
  BoltCircleBold,
} from "solar-icon-set";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { AppRole } from "@/modules/auth/hooks/useUserRole";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { useTheme, THEMES } from "@/hooks/useTheme";

const trainerNav = [
  { title: "painel", url: "/trainer", icon: HomeBold },
  { title: "alunos", url: "/trainer/students", icon: UsersGroupTwoRoundedBold },
  { title: "treinos", url: "/trainer/workouts", icon: DumbbellBold },
  { title: "evolução", url: "/trainer/analytics", icon: ChartBold },
  { title: "chat", url: "/trainer/chat", icon: ChatRoundBold },
  { title: "dieta", url: "/trainer/diet", icon: ChefHatBold },
  { title: "progresso", url: "/trainer/progress", icon: RulerAngularBold },
  { title: "grupos", url: "/trainer/groups", icon: CupBold },
  { title: "TreinAI", url: "/trainer/ai-trainer", icon: BoltCircleBold },
];

interface TrainerSidebarProps {
  onSwitchRole: (role: AppRole) => void;
}

export function TrainerSidebar({ onSwitchRole }: TrainerSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { activeThemeId } = useTheme();
  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="flex items-center justify-center pt-8 pb-6 px-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/15 rounded-full scale-150" />
          <FitSoulLogo className="relative h-10 w-auto" color={`hsl(${activeTheme.primary})`} />
        </div>
        <span className="mt-3 text-[10px] font-black tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full glow-primary-sm">
          PERSONAL
        </span>
      </SidebarHeader>

      <SidebarContent className="flex justify-center px-4 overflow-y-auto">
        <nav className="flex flex-col gap-1 w-[170px] mx-auto">
          {trainerNav.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/trainer"}
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
