import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";
import type { BodyMeasurement } from "../types";

export function useBodyMeasurements() {
    const { user } = useAuth();
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from("body_measurements")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: true });

        if (error) {
            console.error("Error fetching measurements:", error);
        } else {
            setMeasurements((data as unknown as BodyMeasurement[]) || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetch(); }, [fetch]);

    const add = async (
        measurement: Omit<BodyMeasurement, "id" | "user_id" | "created_at">
    ) => {
        if (!user) return;
        const { error } = await (supabase as any)
            .from("body_measurements")
            .insert({ ...measurement, user_id: user.id });

        if (error) {
            toast.error("Erro ao salvar medida");
            console.error(error);
            return false;
        }
        toast.success("Medida registrada! 📏");
        await fetch();
        return true;
    };

    const remove = async (id: string) => {
        const { error } = await (supabase as any)
            .from("body_measurements")
            .delete()
            .eq("id", id);

        if (error) {
            toast.error("Erro ao excluir medida");
            return;
        }
        toast.success("Medida excluída");
        setMeasurements((prev) => prev.filter((m) => m.id !== id));
    };

    const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
    const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

    return { measurements, loading, add, remove, refetch: fetch, latest, previous };
}
