import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { LockBold } from "solar-icon-set";
import { FitSoulLogo } from "@/components/FitSoulLogo";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha atualizada com sucesso!");
      navigate("/");
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-card flex items-center justify-center p-3"><FitSoulLogo className="w-full h-auto" color="hsl(10 99% 55%)" /></div>
            <CardTitle className="text-2xl font-bold text-foreground">Link inválido</CardTitle>
            <CardDescription className="text-muted-foreground">
              Este link de recuperação é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/")}>Voltar ao login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-card flex items-center justify-center p-3"><FitSoulLogo className="w-full h-auto" color="hsl(10 99% 55%)" /></div>
          <CardTitle className="text-2xl font-bold text-foreground">Nova Senha</CardTitle>
          <CardDescription className="text-muted-foreground">
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Nova Senha</Label>
              <div className="relative">
                <LockBold className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-foreground">Confirmar Senha</Label>
              <div className="relative">
                <LockBold className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input id="confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" minLength={6} required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
