import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useNotifications } from "../hooks/useNotifications";
import { useFollows } from "../hooks/useFollows";
import { Button } from "@/components/ui/button";
import { HeartBold, ChatRoundBold, UserPlusBold, CheckCircleBold, CloseCircleBold, FireBold, DangerCircleBold, UsersGroupTwoRoundedBold, MedalRibbonBold, DumbbellBold } from "solar-icon-set";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOTIFICATION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  like: { label: "curtiu seu post", icon: HeartBold, color: "text-destructive" },
  comment: { label: "comentou no seu post", icon: ChatRoundBold, color: "text-primary" },
  follow_request: { label: "quer te seguir", icon: UserPlusBold, color: "text-primary" },
  follow_accepted: { label: "aceitou seu pedido de seguir", icon: CheckCircleBold, color: "text-primary" },
  story_reaction: { label: "reagiu ao seu story", icon: FireBold, color: "text-destructive" },
  story_reply: { label: "respondeu ao seu story", icon: ChatRoundBold, color: "text-primary" },
  group_invite: { label: "convidou você para um grupo", icon: UsersGroupTwoRoundedBold, color: "text-primary" },
  challenge_winner: { label: "terminou o desafio em destaque", icon: MedalRibbonBold, color: "text-amber-500" },
  group_activity: { label: "publicou no grupo", icon: DumbbellBold, color: "text-primary" },
};

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
  const { notifications, loading, markAllRead, markOneRead } = useNotifications();
  const { pendingRequests, acceptFollowRequest, rejectFollowRequest } = useFollows();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      markAllRead();
    }
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base font-black">
            Notificações ({notifications.length})
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 max-h-[60vh]">
          {/* Pending follow requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Solicitações de seguir ({pendingRequests.length})
              </p>
              <div className="flex flex-col gap-1">
                {pendingRequests.map(req => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 bg-primary/5"
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                      {req.profile.avatar_url ? (
                        <img src={req.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-primary">
                          {(req.profile.name || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{req.profile.name || "Usuário"}</p>
                      {req.profile.username && (
                        <p className="text-[10px] text-muted-foreground">@{req.profile.username}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 rounded-lg text-xs font-bold px-3"
                        onClick={() => acceptFollowRequest(req.id, req.follower_id)}
                      >
                        Aceitar
                      </Button>
                      <button
                        onClick={() => rejectFollowRequest(req.id)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <CloseCircleBold size={16} color="currentColor" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 && pendingRequests.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.map(notif => {
                const displayName = notif.actor.name || "Usuário";
                const timeAgo = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR });
                const config = NOTIFICATION_CONFIG[notif.type] || { label: "interagiu com você", icon: HeartBold, color: "text-muted-foreground" };
                const Icon = config.icon;

                return (
                  <button
                    key={notif.id}
                    onClick={() => markOneRead(notif.id)}
                    className={`flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors w-full ${notif.read ? "bg-transparent" : "bg-primary/5"
                      } hover:bg-muted/50`}
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                      {notif.actor.avatar_url ? (
                        <img src={notif.actor.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-bold">{displayName}</span>{" "}
                        {config.label}
                      </p>
                      {notif.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          "{notif.content}"
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                    </div>
                    <div className={`flex-shrink-0 mt-1 ${config.color}`}>
                      <Icon size={16} color="currentColor" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
