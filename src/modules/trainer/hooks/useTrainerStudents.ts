import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface TrainerStudent {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  student_name: string | null;
  student_avatar: string | null;
}

export function useTrainerStudents(user: User | null) {
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("trainer_students")
      .select("id, student_id, status, created_at")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const studentIds = data.map((s) => s.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", studentIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      setStudents(
        data.map((s) => ({
          ...s,
          student_name: profileMap.get(s.student_id)?.name || null,
          student_avatar: profileMap.get(s.student_id)?.avatar_url || null,
        }))
      );
    } else {
      setStudents([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const inviteStudentByUsername = async (username: string) => {
    const { data, error } = await supabase.functions.invoke("search-user", {
      body: { username },
    });

    if (error) {
      const msg = error.message || "Erro ao buscar usuário";
      return { error: msg, data: null };
    }

    if (data?.error) {
      return { error: data.error as string, data: null };
    }

    await fetchStudents();
    return { error: null, data: data.student };
  };

  const removeStudent = async (studentId: string) => {
    if (!user) return;
    await supabase
      .from("trainer_students")
      .delete()
      .eq("trainer_id", user.id)
      .eq("student_id", studentId);
    await fetchStudents();
  };

  return { students, loading, fetchStudents, inviteStudentByUsername, removeStudent };
}
