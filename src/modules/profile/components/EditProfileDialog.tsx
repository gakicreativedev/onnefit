import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { LockBold } from "solar-icon-set";

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSave: (updates: Partial<Profile>) => Promise<{ data: any; error: any } | undefined>;
}

function getUsernameChangesInWindow(changedAt: string[] | null): number {
  if (!changedAt || changedAt.length === 0) return 0;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return changedAt.filter((d) => new Date(d).getTime() > fourteenDaysAgo).length;
}

export function EditProfileDialog({ open, onClose, profile, onSave }: EditProfileDialogProps) {
  const [name, setName] = useState(profile.name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [isPrivate, setIsPrivate] = useState(profile.is_private || false);
  const [saving, setSaving] = useState(false);

  const originalUsername = profile.username || "";
  const changesUsed = getUsernameChangesInWindow(profile.username_changed_at);
  const canChangeUsername = changesUsed < 2;
  const usernameChanged = username !== originalUsername;

  useEffect(() => {
    if (open) {
      setName(profile.name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setIsPrivate(profile.is_private || false);
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (usernameChanged && !canChangeUsername) {
      toast.error("Você já alterou seu nome de usuário 2 vezes nos últimos 14 dias");
      return;
    }
    if (username.trim() && !/^[a-zA-Z0-9._]{3,30}$/.test(username.trim())) {
      toast.error("Username deve ter 3-30 caracteres (letras, números, . e _)");
      return;
    }

    setSaving(true);
    const updates: Partial<Profile> = {
      name: name.trim(),
      bio: bio.trim() || null,
      is_private: isPrivate,
    };

    if (usernameChanged) {
      updates.username = username.trim().toLowerCase();
      const prev = profile.username_changed_at || [];
      updates.username_changed_at = [...prev, new Date().toISOString()] as any;
    }

    const result = await onSave(updates);
    if (result?.error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado!");
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nome de usuário</Label>
              <span className="text-[10px] text-muted-foreground">
                {2 - changesUsed} alteração(ões) restante(s)
              </span>
            </div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
              maxLength={30}
              disabled={!canChangeUsername && usernameChanged}
              placeholder="seu.username"
            />
            {!canChangeUsername && (
              <p className="text-[10px] text-destructive">
                Limite atingido. Tente novamente em 14 dias.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bio</Label>
              <span className="text-[10px] text-muted-foreground">{bio.length}/200</span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              placeholder="Fale sobre você..."
            />
          </div>
          {/* Private profile toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-2.5">
              <LockBold size={18} color="hsl(var(--foreground))" />
              <div>
                <Label htmlFor="private-profile" className="text-sm font-medium cursor-pointer">Conta privada</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Apenas seguidores aprovados veem seu conteúdo
                </p>
              </div>
            </div>
            <Switch id="private-profile" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
