import { useRef } from "react";
import { AddCircleBold } from "solar-icon-set";
import { motion } from "framer-motion";
import type { StoryGroup } from "../hooks/useStories";

interface StoriesCarouselProps {
  storyGroups: StoryGroup[];
  onAddStory: () => void;
  onViewStory: (group: StoryGroup) => void;
  currentUserId?: string;
}

export function StoriesCarousel({ storyGroups, onAddStory, onViewStory, currentUserId }: StoriesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-1">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1 px-1">
        {/* Add story button */}
        <motion.button
          onClick={onAddStory}
          className="flex flex-col items-center gap-1.5 min-w-[72px]"
          whileTap={{ scale: 0.92 }}
        >
          <div className="h-[68px] w-[68px] rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors">
            <AddCircleBold size={28} color="hsl(var(--primary))" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">Seu Story</span>
        </motion.button>

        {/* Story groups */}
        {storyGroups.map((group, i) => (
          <motion.button
            key={group.user_id}
            onClick={() => onViewStory(group)}
            className="flex flex-col items-center gap-1.5 min-w-[72px]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            whileTap={{ scale: 0.92 }}
          >
            <div className="h-[68px] w-[68px] rounded-full p-[2.5px] bg-gradient-to-br from-primary via-primary/80 to-warning">
              <div className="h-full w-full rounded-full overflow-hidden bg-background">
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt={group.name || ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-card">
                    <span className="text-xl font-black text-primary">
                      {(group.name || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-foreground truncate max-w-[68px]">
              {group.user_id === currentUserId ? "Você" : (group.name || "Usuário").split(" ")[0]}
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
