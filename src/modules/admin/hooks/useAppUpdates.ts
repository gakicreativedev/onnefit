import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppUpdate {
  id: string;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  created_by: string;
  created_at: string;
}

export function useAppUpdates() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_updates")
      .select("*")
      .order("created_at", { ascending: false });
    setUpdates((data as AppUpdate[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  const addUpdate = async (update: { title: string; content: string; category: string }, userId: string) => {
    const { error } = await supabase.from("app_updates").insert({ ...update, created_by: userId });
    if (!error) await fetchUpdates();
    return { error };
  };

  const deleteUpdate = async (id: string) => {
    await supabase.from("app_updates").delete().eq("id", id);
    await fetchUpdates();
  };

  return { updates, loading, addUpdate, deleteUpdate, refetch: fetchUpdates };
}
