import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LetterBold, LockBold } from "solar-icon-set";
import { FitSoulLogo } from "@/components/FitSoulLogo";

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Fraca", color: "bg-destructive" };
  if (score <= 3) return { score: 2, label: "Média", color: "bg-yellow-500" };
  return { score: 3, label: "Forte", color: "bg-green-500" };
}

const MOTIVATIONAL = [
  "Sua jornada fitness começa aqui.",
  "Transforme seu corpo, transforme sua vida.",
  "Cada treino conta. Vamos lá!",
  "O melhor projeto é você.",
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const quote = useMemo(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)], []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); }
    else { toast.success("Email de recuperação enviado! Verifique sua caixa de entrada."); setIsForgotPassword(false); }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
      } else {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error("Por favor, insira um email válido."); setLoading(false); return; }
        if (password.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres."); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password, options: { emailRedirectTo: window.location.origin } });
        if (error) { toast.error(error.message); }
        else if (data.user?.identities?.length === 0) { toast.error("Este email já está cadastrado. Faça login."); }
        else if (data.user && !data.session) { toast.success("Verifique seu email para confirmar sua conta!"); }
      }
    } catch { toast.error("Ocorreu um erro inesperado. Tente novamente."); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* ── Animated background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradient center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] animate-pulse-glow" />
        {/* Top-right accent */}
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
        {/* Bottom-left accent */}
        <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] rounded-full bg-primary/4 blur-[80px]" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* ── Logo with glow ── */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full scale-150" />
            <div className="relative h-24 w-24 rounded-3xl bg-card/90 backdrop-blur-sm flex items-center justify-center p-4 glow-primary-sm animate-float border border-primary/20">
              <FitSoulLogo className="w-full h-auto" color="hsl(var(--primary))" />
            </div>
          </div>
        </div>

        {/* ── Card with glassmorphism ── */}
        <div className="glass-card rounded-3xl gradient-border p-6 sm:p-8">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isForgotPassword ? "Recuperar Senha" : isLogin ? "Bem-vindo de volta" : "Criar Conta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword
                ? "Digite seu email para receber o link de recuperação"
                : isLogin
                  ? "Entre para continuar sua jornada fitness"
                  : "Comece sua transformação hoje"}
            </p>
          </div>

          {isForgotPassword ? (
            <div className="space-y-4">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground text-sm font-semibold">Email</Label>
                  <div className="relative group">
                    <LetterBold className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                    <Input id="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base glow-primary-sm hover:glow-primary transition-all" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                <button onClick={() => setIsForgotPassword(false)} className="text-primary font-semibold underline-offset-4 hover:underline">Voltar ao login</button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground text-sm font-semibold">Email</Label>
                  <div className="relative group">
                    <LetterBold className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                    <Input id="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground text-sm font-semibold">Senha</Label>
                    {isLogin && (
                      <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary font-semibold underline-offset-4 hover:underline">Esqueceu a senha?</button>
                    )}
                  </div>
                  <div className="relative group">
                    <LockBold className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" minLength={6} required />
                  </div>
                  {!isLogin && password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${strength.score <= 1 ? "text-destructive" : strength.score <= 2 ? "text-yellow-500" : "text-green-500"}`}>
                        Senha {strength.label}
                      </p>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base glow-primary-sm hover:glow-primary transition-all" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Carregando...
                    </span>
                  ) : isLogin ? "Entrar" : "Criar Conta"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card/80 px-3 text-muted-foreground">ou</span></div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
                <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold underline-offset-4 hover:underline">{isLogin ? "Cadastre-se" : "Entrar"}</button>
              </p>
            </div>
          )}
        </div>

        {/* ── Motivational quote ── */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6 italic">"{quote}"</p>
      </div>
    </div>
  );
}
