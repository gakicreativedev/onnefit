import { useRef } from "react";
import { useXP } from "@/modules/gamification/hooks/useXP";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeBold,
  DumbbellBold,
  ChefHatBold,
  UsersGroupTwoRoundedBold,
  BoltCircleBold,
  ChefHatHeartBold,
  SettingsBold,
  Logout3Bold,
  CameraBold,
  CupBold,
  RulerAngularBold,
} from "solar-icon-set";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { useTheme, THEMES } from "@/hooks/useTheme";

const mainNav = [
  { title: "home", url: "/", icon: HomeBold },
  { title: "treino", url: "/workouts", icon: DumbbellBold },
  { title: "dieta", url: "/diet", icon: ChefHatBold },
  { title: "feed", url: "/social", icon: UsersGroupTwoRoundedBold },
  { title: "treinai", url: "/ai-trainer", icon: BoltCircleBold },
  { title: "dietai", url: "/ai-chef", icon: ChefHatHeartBold },
  { title: "grupos", url: "/groups", icon: CupBold },
  { title: "progresso", url: "/progress", icon: RulerAngularBold },
];

interface AppSidebarProps {
  profile: Profile | null;
  onProfileUpdate?: () => void;
}

export function AppSidebar({ profile, onProfileUpdate }: AppSidebarProps) {
  const { signOut, user } = useAuth();
  const { level } = useXP(user?.id);
  const { activeThemeId } = useTheme();
  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const displayName = profile?.name || "Athlete";
  const username = profile?.username || displayName;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Erro ao enviar foto"); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl + "?t=" + Date.now() }).eq("user_id", user.id);
    if (updateError) { toast.error("Erro ao salvar foto"); return; }
    toast.success("Foto atualizada!");
    onProfileUpdate?.();
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar-background/95 backdrop-blur-sm">
      {/* Logo — centered */}
      <SidebarHeader className="flex items-center justify-center pt-8 pb-6 px-4">
        <FitSoulLogo className="h-10 w-auto" color={`hsl(${activeTheme.primary})`} />
      </SidebarHeader>

      {/* Profile Card — premium style with glow */}
      <div className="flex justify-center px-4 mb-6">
        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center w-[160px] rounded-[20px] border-[3px] border-primary/60 bg-card overflow-hidden cursor-pointer hover:border-primary hover:scale-[1.02] transition-all glow-primary-sm"
        >
          {/* Avatar area */}
          <div className="w-full aspect-square bg-muted flex items-center justify-center relative group overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
            )}
            {/* Camera overlay */}
            <div
              className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <CameraBold size={28} color="currentColor" />
            </div>
          </div>
          {/* Info below avatar */}
          <div className="flex flex-col items-center gap-1.5 py-3 px-2 w-full bg-gradient-to-b from-primary to-primary/80">
            <span className="text-base font-bold text-card">@{username}</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-card/90 px-2.5 py-0.5 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-primary">Level {String(level.level).padStart(2, "0")}</span>
              <span className="text-[8px] font-bold text-primary/60">{level.totalXP} XP</span>
            </span>
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleAvatarUpload} />
      </div>

      {/* Navigation — with active pill indicator */}
      <SidebarContent className="flex justify-center px-4">
        <nav className="flex flex-col gap-1 w-[160px] mx-auto">
          {mainNav.map((item) => {
            const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === "/"}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-base font-semibold transition-all w-full ${isActive
                  ? "text-card bg-primary glow-primary-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  }`}
                activeClassName="!bg-primary !text-card glow-primary-sm"
              >
                <item.icon size={20} color="currentColor" />
                <span className="capitalize">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </SidebarContent>

      {/* Footer — settings & logout with tooltips */}
      <SidebarFooter className="px-5 pb-6 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/settings")}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-card hover:opacity-90 hover:scale-105 active:scale-95 transition-all glow-primary-sm"
            title="Configurações"
          >
            <SettingsBold size={20} color="currentColor" />
          </button>
          <button
            onClick={signOut}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/30 hover:scale-105 active:scale-95 transition-all"
            title="Sair"
          >
            <Logout3Bold size={20} color="currentColor" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
