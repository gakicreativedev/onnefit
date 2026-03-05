import { motion } from "framer-motion";
import { type LeaderboardEntry } from "../hooks/useGroupFeed";
import { Badge } from "@/components/ui/badge";
import { MedalStarBold, CupStarBold } from "solar-icon-set";

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    loading: boolean;
    filter: "daily" | "weekly" | "monthly" | "total";
    onFilterChange: (f: "daily" | "weekly" | "monthly" | "total") => void;
    currentUserId: string;
}

const FILTER_LABELS: Record<string, string> = {
    daily: "Hoje",
    weekly: "Semanal",
    monthly: "Mensal",
    total: "Total",
};

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function LeaderboardTable({ entries, loading, filter, onFilterChange, currentUserId }: LeaderboardTableProps) {
    return (
        <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {(Object.keys(FILTER_LABELS) as Array<"daily" | "weekly" | "monthly" | "total">).map(f => (
                    <Badge
                        key={f}
                        className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-colors shrink-0 ${filter === f
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                            }`}
                        onClick={() => onFilterChange(f)}
                    >
                        {FILTER_LABELS[f]}
                    </Badge>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-10">
                    <span className="text-foreground flex justify-center"><CupStarBold size={40} color="currentColor" /></span>
                    <p className="text-muted-foreground text-sm mt-2">Nenhuma atividade neste período</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry, idx) => {
                        const isMe = entry.user_id === currentUserId;
                        const isTop3 = idx < 3;

                        return (
                            <motion.div
                                key={entry.user_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30"
                                    } ${isTop3 ? "py-4" : ""}`}
                            >
                                {/* Position */}
                                <div className={`flex items-center justify-center shrink-0 ${isTop3 ? "text-2xl w-10" : "text-sm font-bold w-10 text-muted-foreground"}`}>
                                    {isTop3 ? <MedalStarBold size={24} color={MEDAL_COLORS[idx]} /> : `#${idx + 1}`}
                                </div>

                                {/* Avatar */}
                                <div className={`rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden ${isTop3 ? "h-11 w-11" : "h-8 w-8"}`}>
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={`font-bold text-muted-foreground ${isTop3 ? "text-base" : "text-xs"}`}>
                                            {(entry.name || "U")[0].toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold truncate ${isTop3 ? "text-sm" : "text-xs"} ${isMe ? "text-primary" : "text-foreground"}`}>
                                        {entry.name || "Usuário"}
                                        {isMe && <span className="text-[10px] ml-1 text-primary/70">(você)</span>}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{entry.activity_count} atividades</p>
                                </div>

                                {/* Points */}
                                <div className={`shrink-0 font-black ${isTop3 ? "text-lg" : "text-sm"} ${isMe ? "text-primary" : "text-foreground"}`}>
                                    {entry.total_points}
                                    <span className="text-[10px] font-bold text-muted-foreground ml-0.5">pts</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
