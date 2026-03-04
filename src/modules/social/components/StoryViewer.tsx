import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import type { StoryGroup } from "../hooks/useStories";
import { CloseCircleBold, PlainBold, FireBold, HeartBold, EmojiFunnyCircleBold, CupStarBold, DangerCircleBold, LockBold } from "solar-icon-set";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";

const REACTION_ICONS = [
  { key: "fire", icon: FireBold, label: "Fogo", color: "hsl(var(--destructive))" },
  { key: "heart", icon: HeartBold, label: "Amei", color: "hsl(var(--destructive))" },
  { key: "laugh", icon: EmojiFunnyCircleBold, label: "Haha", color: "hsl(var(--primary))" },
  { key: "trophy", icon: CupStarBold, label: "Top", color: "hsl(var(--primary))" },
  { key: "wow", icon: DangerCircleBold, label: "Uau", color: "hsl(var(--accent-foreground))" },
];

interface StoryViewerProps {
  group: StoryGroup | null;
  onClose: () => void;
  onOpenDM?: (userId: string, name: string) => void;
}

export function StoryViewer({ group, onClose, onOpenDM }: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [reactedKey, setReactedKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [isMutual, setIsMutual] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentIdx(0);
    setReactedKey(null);
    setReplyText("");
    setIsPaused(false);
    setIsMutual(null);
  }, [group]);

  // Check mutual follow status
  useEffect(() => {
    if (!user || !group || user.id === group.user_id) return;
    supabase.rpc("are_mutual_followers", { user_a: user.id, user_b: group.user_id })
      .then(({ data }) => setIsMutual(!!data));
  }, [user, group]);

  useEffect(() => {
    if (!group || isPaused) return;
    const timer = setTimeout(() => {
      if (currentIdx < group.stories.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        onClose();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIdx, group, onClose, isPaused]);

  if (!group) return null;

  const story = group.stories[currentIdx];
  const isOwnStory = user?.id === group.user_id;
  const canMessage = isMutual === true;

  const handleReact = async (key: string) => {
    if (!user || isOwnStory) return;
    setReactedKey(key);

    await supabase.from("story_reactions").upsert({
      story_id: story.id,
      user_id: user.id,
      emoji: key,
    }, { onConflict: "story_id,user_id" });

    await supabase.from("notifications").insert({
      user_id: group.user_id,
      actor_id: user.id,
      type: "story_reaction",
      content: key,
      post_id: null,
    });

    toast.success("Reação enviada!");
    setTimeout(() => setReactedKey(null), 1500);
  };

  const handleSendReply = async () => {
    if (!user || !replyText.trim() || sendingReply || !canMessage) return;
    setSendingReply(true);

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: group.user_id,
      content: replyText.trim(),
    });

    if (error) {
      toast.error("Vocês precisam ser seguidores mútuos para enviar mensagens");
      setSendingReply(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: group.user_id,
      actor_id: user.id,
      type: "story_reply",
      content: replyText.trim(),
      post_id: null,
    });

    toast.success("Resposta enviada!");
    setReplyText("");
    setIsPaused(false);
    setSendingReply(false);
  };

  const handleReplyFocus = () => setIsPaused(true);
  const handleReplyBlur = () => {
    if (!replyText.trim()) setIsPaused(false);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const reactedIcon = reactedKey ? REACTION_ICONS.find(r => r.key === reactedKey) : null;

  return (
    <Dialog open={!!group} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm p-0 bg-background border-0 overflow-hidden rounded-2xl">
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-foreground/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${i < currentIdx ? "w-full bg-foreground" : i === currentIdx ? (isPaused ? "bg-foreground" : "w-full bg-foreground animate-[grow_5s_linear]") : "w-0"
                  }`}
                style={i === currentIdx && isPaused ? { width: "50%" } : undefined}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-3 right-3 z-10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-muted">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{(group.name || "U").charAt(0)}</span>
              </div>
            )}
          </div>
          <span className="text-sm font-bold text-foreground drop-shadow-lg">{group.name}</span>
        </div>

        {/* Image */}
        <div className="w-full aspect-[9/16] bg-muted">
          <img src={story.image_url} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Reaction animation */}
        <AnimatePresence>
          {reactedIcon && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <reactedIcon.icon size={72} color={reactedIcon.color} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: Reply input + Reactions */}
        {!isOwnStory && (
          <div className="absolute bottom-4 left-3 right-3 z-10 flex flex-col gap-2">
            {/* Reply text input — only for mutual followers */}
            {canMessage ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onFocus={handleReplyFocus}
                  onBlur={handleReplyBlur}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Enviar mensagem..."
                  className="flex-1 rounded-full bg-background/80 backdrop-blur-sm border-0 text-sm h-10 px-4 placeholder:text-muted-foreground/70"
                />
                {replyText.trim() && (
                  <motion.button
                    onClick={handleSendReply}
                    whileTap={{ scale: 0.9 }}
                    disabled={sendingReply}
                    className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                  >
                    <PlainBold size={18} color="hsl(var(--primary-foreground))" />
                  </motion.button>
                )}
              </div>
            ) : isMutual === false ? (
              <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2.5">
                <LockBold size={14} color="hsl(var(--muted-foreground))" />
                <span className="text-xs text-muted-foreground">Sigam-se mutuamente para enviar mensagens</span>
              </div>
            ) : null}
            {/* Reactions row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1.5">
                {REACTION_ICONS.map(({ key, icon: Icon, color }) => (
                  <motion.button
                    key={key}
                    onClick={() => handleReact(key)}
                    whileTap={{ scale: 1.4 }}
                    className="p-1.5 hover:bg-muted/60 rounded-full transition-colors"
                  >
                    <Icon size={20} color={color} />
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex" style={{ top: "60px", bottom: isOwnStory ? "0" : "100px" }}>
          <div className="w-1/3" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} />
          <div className="w-1/3" onClick={() => setIsPaused(p => !p)} />
          <div className="w-1/3" onClick={() => {
            if (currentIdx < group.stories.length - 1) setCurrentIdx(currentIdx + 1);
            else onClose();
          }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
