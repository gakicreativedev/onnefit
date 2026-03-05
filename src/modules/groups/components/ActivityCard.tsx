import { useState } from "react";
import { motion } from "framer-motion";
import { type GroupActivity, type ActivityComment } from "../hooks/useGroupFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrashBinTrashBold, ChatRoundLineBold, PlainBold, RunningBold, StopwatchBold, FireBold, WalkingBold, DumbbellBold, HandStarsBold, HeartBold, CupStarBold } from "solar-icon-set";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityCardProps {
    activity: GroupActivity;
    isOwnActivity: boolean;
    availableEmojis: string[];
    onReaction: (activityId: string, emoji: string) => void;
    onDelete: (activityId: string) => void;
    onFetchComments: (activityId: string) => Promise<ActivityComment[]>;
    onAddComment: (activityId: string, content: string) => void;
    onDeleteComment: (commentId: string, activityId: string) => void;
    currentUserId: string;
}

export default function ActivityCard({
    activity,
    isOwnActivity,
    availableEmojis,
    onReaction,
    onDelete,
    onFetchComments,
    onAddComment,
    onDeleteComment,
    currentUserId,
}: ActivityCardProps) {
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments] = useState<ActivityComment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);

    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR });

    const openComments = async () => {
        setCommentsOpen(true);
        setLoadingComments(true);
        const data = await onFetchComments(activity.id);
        setComments(data);
        setLoadingComments(false);
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        await onAddComment(activity.id, commentText.trim());
        setCommentText("");
        // Refresh comments
        const data = await onFetchComments(activity.id);
        setComments(data);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card overflow-hidden border border-border/30"
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 pb-2">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {activity.author.avatar_url ? (
                            <img src={activity.author.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-muted-foreground">
                                {(activity.author.name || "U")[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{activity.author.name || "Usuário"}</p>
                        <p className="text-[11px] text-muted-foreground">{timeAgo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary bg-primary/10 rounded-full px-2.5 py-1">
                            +{activity.points_awarded.toFixed(1)} pts
                        </span>
                        {isOwnActivity && (
                            <button
                                onClick={() => { if (window.confirm("Excluir atividade?")) onDelete(activity.id); }}
                                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <TrashBinTrashBold size={14} color="currentColor" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Photo */}
                <div className="px-4 pb-2">
                    <img
                        src={activity.photo_url}
                        alt={activity.title}
                        className="w-full aspect-[4/3] object-cover rounded-xl"
                        loading="lazy"
                    />
                </div>

                {/* Title & Description */}
                <div className="px-4 pb-2">
                    <h4 className="text-sm font-bold text-foreground">{activity.title}</h4>
                    {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                    )}
                </div>

                {/* Metrics */}
                {(activity.distance_km || activity.duration_min || activity.calories || activity.steps) && (
                    <div className="flex flex-wrap gap-3 px-4 pb-2">
                        {activity.distance_km != null && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <RunningBold size={14} color="currentColor" /> {activity.distance_km} km
                            </span>
                        )}
                        {activity.duration_min != null && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <StopwatchBold size={14} color="currentColor" /> {activity.duration_min} min
                            </span>
                        )}
                        {activity.calories != null && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <FireBold size={14} color="currentColor" /> {activity.calories} kcal
                            </span>
                        )}
                        {activity.steps != null && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <WalkingBold size={14} color="currentColor" /> {activity.steps}
                            </span>
                        )}
                    </div>
                )}

                {/* Reactions bar */}
                <div className="flex items-center gap-1 px-4 pb-2 flex-wrap">
                    {availableEmojis.map(emoji => {
                        const count = activity.reactions[emoji]?.length || 0;
                        const myReacted = activity.my_reactions.includes(emoji);
                        return (
                            <button
                                key={emoji}
                                onClick={() => onReaction(activity.id, emoji)}
                                className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-xs transition-all ${myReacted
                                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    }`}
                            >
                                {emoji === "🔥" ? <FireBold size={14} color="currentColor" /> :
                                    emoji === "💪" ? <DumbbellBold size={14} color="currentColor" /> :
                                        emoji === "👏" ? <HandStarsBold size={14} color="currentColor" /> :
                                            emoji === "❤️" ? <HeartBold size={14} color="currentColor" /> :
                                                emoji === "🏆" ? <CupStarBold size={14} color="currentColor" /> :
                                                    <span>{emoji}</span>}
                                {count > 0 && <span className="font-bold text-[10px]">{count}</span>}
                            </button>
                        );
                    })}

                    {/* Comments button */}
                    <button
                        onClick={openComments}
                        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-muted/50 text-muted-foreground hover:bg-muted transition-colors ml-auto"
                    >
                        <ChatRoundLineBold size={12} color="currentColor" />
                        <span className="font-bold text-[10px]">{activity.comments_count}</span>
                    </button>
                </div>
            </motion.div>

            {/* Comments Dialog */}
            <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
                <DialogContent className="max-h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black">Comentários</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[100px]">
                        {loadingComments ? (
                            <div className="flex justify-center py-6">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        ) : comments.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-6">Nenhum comentário ainda</p>
                        ) : (
                            comments.map(c => (
                                <div key={c.id} className="flex gap-2">
                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                        {c.author.avatar_url ? (
                                            <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {(c.author.name || "U")[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-foreground">{c.author.name}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                                            </span>
                                            {c.user_id === currentUserId && (
                                                <button
                                                    onClick={() => onDeleteComment(c.id, activity.id)}
                                                    className="text-muted-foreground hover:text-destructive ml-auto"
                                                >
                                                    <TrashBinTrashBold size={10} color="currentColor" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground">{c.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Input
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            placeholder="Escreva um comentário..."
                            className="flex-1 h-9 text-sm"
                            onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
                        />
                        <Button size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={handleAddComment} disabled={!commentText.trim()}>
                            <PlainBold size={16} color="currentColor" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
