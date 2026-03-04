import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateInput, isValidDate, calculateAge } from "../../utils";
import { supabase } from "@/integrations/supabase/client";
import type { OnboardingData } from "../../types";

interface PersonalInfoStepProps {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: any) => void;
}

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

function sanitizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20);
}

export function PersonalInfoStep({ data, onUpdate }: PersonalInfoStepProps) {
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const handleUsernameChange = async (raw: string) => {
    const clean = sanitizeUsername(raw);
    onUpdate("username", clean);

    if (!USERNAME_REGEX.test(clean)) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .maybeSingle();

    setUsernameStatus(existing ? "taken" : "available");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          value={data.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder="Seu nome"
          maxLength={60}
        />
      </div>
      <div className="space-y-2">
        <Label>Nome de usuário</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input
            value={data.username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="seu.usuario"
            maxLength={20}
            className="pl-8"
          />
        </div>
        {data.username.length > 0 && (
          <p className={`text-xs ${
            usernameStatus === "checking" ? "text-muted-foreground" :
            usernameStatus === "available" ? "text-green-500" :
            usernameStatus === "taken" ? "text-destructive" :
            !USERNAME_REGEX.test(data.username) ? "text-destructive" :
            "text-muted-foreground"
          }`}>
            {usernameStatus === "checking" ? "Verificando..." :
             usernameStatus === "available" ? "Disponível ✓" :
             usernameStatus === "taken" ? "Já está em uso" :
             !USERNAME_REGEX.test(data.username) ? "3-20 caracteres (letras, números, . e _)" :
             ""}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Data de Nascimento</Label>
        <Input
          value={data.date_of_birth}
          onChange={(e) => onUpdate("date_of_birth", formatDateInput(e.target.value))}
          placeholder="DD/MM/AAAA"
          maxLength={10}
          inputMode="numeric"
        />
        {data.date_of_birth.length === 10 && isValidDate(data.date_of_birth) && (
          <p className="text-xs text-muted-foreground">{calculateAge(data.date_of_birth)} anos</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Sexo Biológico</Label>
        <Select value={data.gender} onValueChange={(v) => onUpdate("gender", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Masculino</SelectItem>
            <SelectItem value="female">Feminino</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Altura (cm)</Label>
          <Input
            type="number"
            value={data.height_cm}
            onChange={(e) => onUpdate("height_cm", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Peso (kg)</Label>
          <Input
            type="number"
            value={data.weight_kg}
            onChange={(e) => onUpdate("weight_kg", Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
