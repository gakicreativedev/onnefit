import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddCircleBold, CloseCircleBold } from "solar-icon-set";

interface Props {
  steps: string[];
  onChange: (steps: string[]) => void;
}

export default function StepListInput({ steps, onChange }: Props) {
  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    onChange(updated);
  };

  const addStep = () => onChange([...steps, ""]);

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>Modo de Preparo</Label>
      {steps.map((step, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
          <Input
            value={step}
            onChange={e => updateStep(i, e.target.value)}
            placeholder={`Passo ${i + 1}...`}
            className="rounded-xl bg-muted/50 border-0 text-sm flex-1"
          />
          <button type="button" onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0" disabled={steps.length <= 1}>
            <CloseCircleBold size={18} color="currentColor" />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={addStep} className="w-full text-primary gap-1">
        <AddCircleBold size={16} color="currentColor" />
        Adicionar passo
      </Button>
    </div>
  );
}
