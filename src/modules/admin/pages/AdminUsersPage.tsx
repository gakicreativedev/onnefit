import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VerifiedCheckBold, UserBold, CloseSquareBold } from "solar-icon-set";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("user_id, name, username, avatar_url, is_verified")
      .order("name", { ascending: true })
      .limit(100);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,username.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setUsers((data as UserRow[]) || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleVerified = async (userId: string, currentState: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !currentState })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao atualizar verificação");
      return;
    }

    setUsers(prev =>
      prev.map(u => u.user_id === userId ? { ...u, is_verified: !currentState } : u)
    );
    toast.success(!currentState ? "Usuário verificado ✓" : "Verificação removida");
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <VerifiedCheckBold size={24} color="hsl(var(--primary))" />
          Verificação de Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie o selo de verificação dos perfis
        </p>
      </div>

      <Input
        placeholder="Buscar por nome ou @username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.user_id}
              className="flex items-center justify-between rounded-xl bg-card border border-border/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserBold size={20} color="hsl(var(--muted-foreground))" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground">{user.name || "Sem nome"}</span>
                    {user.is_verified && <VerifiedCheckBold size={14} color="hsl(var(--primary))" />}
                  </div>
                  <span className="text-xs text-muted-foreground">@{user.username || "—"}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant={user.is_verified ? "destructive" : "default"}
                onClick={() => toggleVerified(user.user_id, user.is_verified)}
                className="gap-1.5 text-xs"
              >
                {user.is_verified ? (
                  <>
                    <CloseSquareBold size={14} color="currentColor" />
                    Remover
                  </>
                ) : (
                  <>
                    <VerifiedCheckBold size={14} color="currentColor" />
                    Verificar
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
