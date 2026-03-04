import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  age: number | null;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;
  bmr: number | null;
  calorie_target: number | null;
  onboarding_completed: boolean;
  avatar_url: string | null;
  injuries: string[] | null;
  allergies: string[] | null;
  dietary_restrictions: string[] | null;
  username_changed_at: string[] | null;
  is_verified: boolean;
  is_private: boolean;
}

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (retries = MAX_RETRIES): Promise<void> => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setLoading(false);
        return;
      }

      // Profile not found — trigger may still be running
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchProfile(retries - 1);
      }

      // Exhausted retries — profile truly doesn't exist
      console.warn("Profile not found after retries for user:", user.id);
      setProfile(null);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching profile:", err);
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchProfile(retries - 1);
      }
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: new Error("No user") };
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();
    if (!error && data) setProfile(data as Profile);
    return { data, error };
  }, [user]);

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
