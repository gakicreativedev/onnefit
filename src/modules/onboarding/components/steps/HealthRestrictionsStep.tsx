import { Label } from "@/components/ui/label";
import { TagInput } from "../TagInput";
import type { OnboardingData } from "../../types";

interface HealthRestrictionsStepProps {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: any) => void;
}

export function HealthRestrictionsStep({ data, onUpdate }: HealthRestrictionsStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Lesões ou Limitações Físicas</Label>
        <p className="text-xs text-muted-foreground">Ex: hérnia de disco, tendinite no ombro</p>
        <TagInput
          tags={data.injuries}
          onChange={(t) => onUpdate("injuries", t)}
          placeholder="Adicionar lesão..."
        />
      </div>
      <div className="space-y-2">
        <Label>Alergias Alimentares</Label>
        <p className="text-xs text-muted-foreground">Ex: lactose, glúten, amendoim</p>
        <TagInput
          tags={data.allergies}
          onChange={(t) => onUpdate("allergies", t)}
          placeholder="Adicionar alergia..."
        />
      </div>
      <div className="space-y-2">
        <Label>Restrições Alimentares</Label>
        <p className="text-xs text-muted-foreground">Ex: vegetariano, vegano, sem açúcar</p>
        <TagInput
          tags={data.dietary_restrictions}
          onChange={(t) => onUpdate("dietary_restrictions", t)}
          placeholder="Adicionar restrição..."
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Essas informações são privadas e serão usadas pela IA para personalizar seus treinos e dietas.
      </p>
    </div>
  );
}
