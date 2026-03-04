import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MagniferBold, HashtagBold, UserBold, CloseCircleBold } from "solar-icon-set";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

interface SearchResult {
  type: "user" | "tag";
  id: string;
  label: string;
  sublabel?: string;
  avatar_url?: string | null;
}

interface FeedSearchBarProps {
  onTagSelect: (tag: string) => void;
  activeTag: string | null;
  onClearTag: () => void;
}

export function FeedSearchBar({ onTagSelect, activeTag, onClearTag }: FeedSearchBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = async (term: string) => {
    if (!term.trim() || !user) {
      setResults([]);
      return;
    }
    setLoading(true);

    const isTagSearch = term.startsWith("#");
    const cleanTerm = term.replace(/^#/, "").trim();

    if (!cleanTerm) { setResults([]); setLoading(false); return; }

    const combined: SearchResult[] = [];

    if (isTagSearch) {
      // Search tags only
      const { data: tagPosts } = await supabase
        .from("posts")
        .select("tags")
        .not("tags", "eq", "{}")
        .limit(100);

      const tagCounts = new Map<string, number>();
      (tagPosts || []).forEach(p => {
        ((p.tags as string[]) || []).forEach(t => {
          if (t.toLowerCase().includes(cleanTerm.toLowerCase())) {
            tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
          }
        });
      });

      Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .forEach(([tag, count]) => {
          combined.push({
            type: "tag",
            id: tag,
            label: `#${tag}`,
            sublabel: `${count} post${count > 1 ? "s" : ""}`,
          });
        });
    } else {
      // Search users
      const { data: users } = await supabase
        .from("public_profiles")
        .select("user_id, name, avatar_url, username")
        .or(`name.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%`)
        .neq("user_id", user.id)
        .limit(6);

      (users || []).forEach(u => {
        combined.push({
          type: "user",
          id: u.user_id!,
          label: u.name || "Usuário",
          sublabel: u.username ? `@${u.username}` : undefined,
          avatar_url: u.avatar_url,
        });
      });

      // Also search tags
      const { data: tagPosts } = await supabase
        .from("posts")
        .select("tags")
        .not("tags", "eq", "{}")
        .limit(100);

      const tagCounts = new Map<string, number>();
      (tagPosts || []).forEach(p => {
        ((p.tags as string[]) || []).forEach(t => {
          if (t.toLowerCase().includes(cleanTerm.toLowerCase())) {
            tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
          }
        });
      });

      Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .forEach(([tag, count]) => {
          combined.push({
            type: "tag",
            id: tag,
            label: `#${tag}`,
            sublabel: `${count} post${count > 1 ? "s" : ""}`,
          });
        });

      // Search content too
      const { data: contentPosts } = await supabase
        .from("posts")
        .select("tags")
        .textSearch("content", cleanTerm, { config: "portuguese" })
        .limit(20);

      // Extract tags from content search results to boost relevance
      (contentPosts || []).forEach(p => {
        ((p.tags as string[]) || []).forEach(t => {
          if (!tagCounts.has(t)) {
            combined.push({
              type: "tag",
              id: t,
              label: `#${t}`,
              sublabel: "relacionado",
            });
          }
        });
      });
    }

    setResults(combined);
    setLoading(false);
  };

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === "user") {
      navigate(`/user/${result.id}`);
    } else {
      onTagSelect(result.id);
      setQuery("");
    }
    setFocused(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <MagniferBold
          size={18}
          color="hsl(var(--muted-foreground))"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Buscar pessoas, #tags ou conteúdo..."
          className="w-full h-10 rounded-full bg-card border border-border/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Active tag filter pill */}
      <AnimatePresence>
        {activeTag && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 mt-2"
          >
            <span className="text-xs text-muted-foreground">Filtrando por:</span>
            <button
              onClick={onClearTag}
              className="flex items-center gap-1 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold hover:bg-primary/25 transition-colors"
            >
              <HashtagBold size={12} color="currentColor" />
              {activeTag}
              <CloseCircleBold size={14} color="currentColor" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown results */}
      <AnimatePresence>
        {focused && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-12 left-0 right-0 rounded-2xl bg-card border border-border/60 shadow-xl overflow-hidden max-h-[300px] overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}-${i}`}
                  onClick={() => handleSelect(r)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  {r.type === "user" ? (
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserBold size={18} color="hsl(var(--primary))" />
                      )}
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <HashtagBold size={18} color="hsl(var(--primary))" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate">{r.label}</span>
                    {r.sublabel && (
                      <span className="text-[11px] text-muted-foreground truncate">{r.sublabel}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
