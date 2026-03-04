import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "athlete" | "professional" | "admin";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

export function useUserRole(user: User | null) {
  const [dbRole, setDbRole] = useState<AppRole>("athlete");
  const [activeRole, setActiveRole] = useState<AppRole>("athlete");
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (retries = MAX_RETRIES): Promise<void> => {
    if (!user) {
      setDbRole("athlete");
      setActiveRole("athlete");
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.role) {
        const role = data.role as AppRole;
        setDbRole(role);
        setActiveRole(role);
        setLoading(false);
        return;
      }

      // Role not found — trigger may still be running
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchRole(retries - 1);
      }

      setDbRole("athlete");
      setActiveRole("athlete");
      setLoading(false);
    } catch {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchRole(retries - 1);
      }
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchRole();
  }, [fetchRole]);

  const switchRole = useCallback(async (newRole: AppRole) => {
    setActiveRole(newRole);
  }, []);

  return { role: activeRole, dbRole, loading, switchRole, refetch: fetchRole };
}
