import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEASUREMENT_LABELS, MEASUREMENT_ICONS, type MeasurementField, type BodyMeasurement } from "../types";

interface MeasurementFormProps {
    onSubmit: (data: Omit<BodyMeasurement, "id" | "user_id" | "created_at">) => Promise<boolean | undefined>;
    onCancel: () => void;
}

const FIELDS: MeasurementField[] = [
    "weight_kg", "body_fat_pct", "waist_cm", "hip_cm", "chest_cm",
    "arm_left_cm", "arm_right_cm", "thigh_left_cm", "thigh_right_cm", "neck_cm",
];

export function MeasurementForm({ onSubmit, onCancel }: MeasurementFormProps) {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const data: any = { date, notes: notes || null };
        for (const field of FIELDS) {
            data[field] = values[field] ? parseFloat(values[field]) : null;
        }

        // At least one measurement required
        const hasValue = FIELDS.some((f) => data[f] !== null);
        if (!hasValue) {
            setSaving(false);
            return;
        }

        const ok = await onSubmit(data);
        setSaving(false);
        if (ok) {
            setValues({});
            setNotes("");
            onCancel();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="date" className="text-sm font-semibold">Data</Label>
                <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 h-11 rounded-xl bg-background/50"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                {FIELDS.map((field) => (
                    <div key={field}>
                        <Label htmlFor={field} className="text-xs font-medium text-muted-foreground">
                            {MEASUREMENT_ICONS[field]} {MEASUREMENT_LABELS[field]}
                        </Label>
                        <Input
                            id={field}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="—"
                            value={values[field] || ""}
                            onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                            className="mt-0.5 h-10 rounded-xl bg-background/50 text-sm"
                        />
                    </div>
                ))}
            </div>

            <div>
                <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">📝 Observações</Label>
                <Input
                    id="notes"
                    placeholder="Como você se sente?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-0.5 h-10 rounded-xl bg-background/50"
                />
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" className="flex-1 rounded-xl glow-primary-sm" disabled={saving}>
                    {saving ? "Salvando..." : "Registrar"}
                </Button>
            </div>
        </form>
    );
}
