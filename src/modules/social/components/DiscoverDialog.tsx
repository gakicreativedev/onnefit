import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFollows, type FollowUser } from "../hooks/useFollows";
import { UserPlusBold, LockBold } from "solar-icon-set";

interface DiscoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscoverDialog({ open, onOpenChange }: DiscoverDialogProps) {
  const { toggleFollow, isFollowing, getFollowStatus, discoverUsers } = useFollows();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      discoverUsers().then(u => { setUsers(u); setLoading(false); });
    }
  }, [open, discoverUsers]);

  const handleToggle = async (u: FollowUser) => {
    await toggleFollow(u.user_id, u.is_private);
    setUsers(prev => prev.map(user => {
      if (user.user_id !== u.user_id) return user;
      const currentStatus = user.follow_status;
      if (currentStatus === "accepted" || currentStatus === "pending") {
        return { ...user, is_following: false, follow_status: undefined };
      }
      return {
        ...user,
        is_following: !user.is_private,
        follow_status: user.is_private ? "pending" : "accepted",
      };
    }));
  };

  const getButtonState = (u: FollowUser) => {
    const status = u.follow_status || getFollowStatus(u.user_id);
    if (status === "accepted" || isFollowing(u.user_id)) return { label: "Seguindo", variant: "outline" as const };
    if (status === "pending") return { label: "Solicitado", variant: "outline" as const };
    return { label: "Seguir", variant: "default" as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <UserPlusBold size={20} color="hsl(var(--primary))" />
            Descobrir Pessoas
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map(u => {
              const displayName = u.name || "Usuário";
              const username = u.username || displayName;
              const btn = getButtonState(u);

              return (
                <div key={u.user_id} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-foreground">{displayName}</span>
                        {u.is_private && <LockBold size={12} color="hsl(var(--muted-foreground))" />}
                      </div>
                      <span className="text-xs text-muted-foreground">@{username}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={btn.variant}
                    className="rounded-full px-4 text-xs font-bold h-8"
                    onClick={() => handleToggle(u)}
                  >
                    {btn.label}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
