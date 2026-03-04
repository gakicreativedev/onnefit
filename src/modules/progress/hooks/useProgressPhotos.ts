import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";
import type { ProgressPhoto } from "../types";

export function useProgressPhotos() {
    const { user } = useAuth();
    const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from("progress_photos")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false });

        if (error) {
            console.error("Error fetching progress photos:", error);
        } else {
            setPhotos((data as unknown as ProgressPhoto[]) || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetch(); }, [fetch]);

    const upload = async (
        file: File,
        category: "front" | "side" | "back",
        date: string,
        notes?: string
    ) => {
        if (!user) return false;
        setUploading(true);

        try {
            const ext = file.name.split(".").pop();
            const path = `${user.id}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("progress-photos")
                .upload(path, file, { upsert: false });

            if (uploadError) {
                toast.error("Erro ao enviar foto");
                console.error(uploadError);
                return false;
            }

            const { data: urlData } = supabase.storage
                .from("progress-photos")
                .getPublicUrl(path);

            const { error: insertError } = await (supabase as any)
                .from("progress_photos")
                .insert({
                    user_id: user.id,
                    date,
                    photo_url: urlData.publicUrl,
                    category,
                    notes: notes || null,
                });

            if (insertError) {
                toast.error("Erro ao salvar registro da foto");
                console.error(insertError);
                return false;
            }

            toast.success("Foto adicionada! 📸");
            await fetch();
            return true;
        } finally {
            setUploading(false);
        }
    };

    const remove = async (photo: ProgressPhoto) => {
        // Extract storage path from URL
        const urlParts = photo.photo_url.split("/progress-photos/");
        if (urlParts.length > 1) {
            await supabase.storage.from("progress-photos").remove([urlParts[1]]);
        }

        const { error } = await (supabase as any)
            .from("progress_photos")
            .delete()
            .eq("id", photo.id);

        if (error) {
            toast.error("Erro ao excluir foto");
            return;
        }
        toast.success("Foto excluída");
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    };

    return { photos, loading, uploading, upload, remove, refetch: fetch };
}
