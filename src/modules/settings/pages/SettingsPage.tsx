import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";
import type { AppRole } from "@/modules/auth/hooks/useUserRole";
import { useTheme, THEMES } from "@/hooks/useTheme";
import {
  PaletteBold,
  BellBold,
  ShieldKeyholeBold,
  InfoCircleBold,
  Logout3Bold,
  TrashBin2Bold,
  TransferHorizontalBold,
  AltArrowDownBold,
  AltArrowUpBold,
} from "solar-icon-set";

interface SettingsPageProps {
  dbRole?: AppRole;
  activeRole?: AppRole;
  onSwitchRole?: (role: AppRole) => void;
}

export default function SettingsPage({ dbRole, activeRole, onSwitchRole }: SettingsPageProps) {
  const { signOut } = useAuth();
  const { activeThemeId, setTheme, mode, setMode } = useTheme();
  const isLight = mode === "light";
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [workoutReminder, setWorkoutReminder] = useState(true);
  const [waterReminder, setWaterReminder] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const handleDeleteAccount = () => {
    toast.error("Entre em contato com o suporte para excluir sua conta.");
  };

  const isAdmin = dbRole === "admin";
  const isProfessional = dbRole === "professional";
  const showModeCard = (isAdmin || isProfessional) && onSwitchRole;

  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? THEMES[0];

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas preferências do app</p>
      </div>

      {/* Modo de Acesso */}
      {showModeCard && (
        <Card className="border-0 bg-card rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <TransferHorizontalBold size={20} className="text-primary" />
            <CardTitle className="text-base">Modo de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAdmin && (
              <button
                onClick={() => onSwitchRole("admin")}
                className={`flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  activeRole === "admin"
                    ? "bg-destructive/10 text-destructive ring-2 ring-destructive/30"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <div className="text-left">
                  <span className="block">Painel Admin</span>
                  <span className="text-xs font-normal opacity-70">Gerenciamento completo do app</span>
                </div>
                {activeRole === "admin" && (
                  <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">ATIVO</span>
                )}
              </button>
            )}

            <button
              onClick={() => onSwitchRole("professional")}
              className={`flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeRole === "professional"
                  ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="text-left">
                <span className="block">Modo Personal</span>
                <span className="text-xs font-normal opacity-70">Painel de personal trainer</span>
              </div>
              {activeRole === "professional" && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">ATIVO</span>
              )}
            </button>

            <button
              onClick={() => onSwitchRole("athlete")}
              className={`flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeRole === "athlete"
                  ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="text-left">
                <span className="block">Modo Atleta</span>
                <span className="text-xs font-normal opacity-70">Acessar como usuário comum</span>
              </div>
              {activeRole === "athlete" && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">ATIVO</span>
              )}
            </button>
          </CardContent>
        </Card>
      )}

      {/* Aparência */}
      <Card className="border-0 bg-card rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <PaletteBold size={20} className="text-primary" />
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-sm font-medium">Modo Escuro</Label>
            <Switch
              id="dark-mode"
              checked={!isLight}
              onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
            />
          </div>

          <Separator />

          {/* Tema de Cores — collapsible */}
          <div>
            <button
              onClick={() => setThemeOpen((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Cor do Tema</span>
                {/* Preview da cor ativa */}
                <span
                  className="inline-block h-5 w-5 rounded-full ring-2 ring-offset-2 ring-offset-card"
                  style={{ background: `hsl(${activeTheme.primary})` }}
                />
                <span className="text-xs text-muted-foreground">{activeTheme.label}</span>
              </div>
              {themeOpen ? (
                <AltArrowUpBold size={16} className="text-muted-foreground" />
              ) : (
                <AltArrowDownBold size={16} className="text-muted-foreground" />
              )}
            </button>

            {themeOpen && (
              <div className="mt-4 grid grid-cols-7 gap-2">
                {THEMES.map((theme) => {
                  const isActive = theme.id === activeThemeId;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      title={theme.label}
                      className={`flex flex-col items-center gap-1.5 group`}
                    >
                      <span
                        className={`h-9 w-9 rounded-full transition-all duration-200 ${
                          isActive
                            ? "scale-110 ring-2 ring-offset-2 ring-offset-card"
                            : "hover:scale-105 opacity-70 hover:opacity-100"
                        }`}
                        style={{
                          background: `hsl(${theme.primary})`,
                          ...(isActive ? { outlineColor: `hsl(${theme.primary})`, boxShadow: `0 0 0 2px hsl(${theme.primary})` } : {}),
                        }}
                      />
                      <span className={`text-[10px] leading-none ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card className="border-0 bg-card rounded-2xl">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <BellBold size={20} className="text-primary" />
          <CardTitle className="text-base">Notificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push" className="text-sm font-medium">Push Notifications</Label>
            <Switch id="push" checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="text-sm font-medium">E-mail Notifications</Label>
            <Switch id="email" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="workout-reminder" className="text-sm font-medium">Lembrete de Treino</Label>
            <Switch id="workout-reminder" checked={workoutReminder} onCheckedChange={setWorkoutReminder} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="water-reminder" className="text-sm font-medium">Lembrete de Água</Label>
            <Switch id="water-reminder" checked={waterReminder} onCheckedChange={setWaterReminder} />
          </div>
        </CardContent>
      </Card>

      {/* Privacidade */}
      <Card className="border-0 bg-card rounded-2xl">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <ShieldKeyholeBold size={20} className="text-primary" />
          <CardTitle className="text-base">Privacidade & Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Seus dados são protegidos e criptografados. Nenhuma informação é compartilhada com terceiros.
          </p>
        </CardContent>
      </Card>

      {/* Sobre */}
      <Card className="border-0 bg-card rounded-2xl">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <InfoCircleBold size={20} className="text-primary" />
          <CardTitle className="text-base">Sobre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versão</span>
            <span className="text-foreground font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Desenvolvido por</span>
            <span className="text-foreground font-medium">FitSoul</span>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-col gap-3 pb-6">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 rounded-xl h-12 text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <Logout3Bold size={18} color="currentColor" />
          Sair da conta
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 rounded-xl h-12 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={handleDeleteAccount}
        >
          <TrashBin2Bold size={18} color="currentColor" />
          Excluir minha conta
        </Button>
      </div>
    </div>
  );
}
