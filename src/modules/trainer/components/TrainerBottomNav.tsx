import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { AnimatePresence, motion } from "framer-motion";
import {
  HomeBold,
  UsersGroupTwoRoundedBold,
  DumbbellBold,
  ChatRoundBold,
  ChartBold,
  HamburgerMenuBold,
  CloseCircleBold,
  ChefHatBold,
  RulerAngularBold,
  CupBold,
  BoltCircleBold,
} from "solar-icon-set";

const mainNav = [
  { title: "Painel", url: "/trainer", icon: HomeBold },
  { title: "Alunos", url: "/trainer/students", icon: UsersGroupTwoRoundedBold },
  { title: "Treinos", url: "/trainer/workouts", icon: DumbbellBold },
  { title: "Evolução", url: "/trainer/analytics", icon: ChartBold },
];

const moreLinks = [
  { title: "Chat", url: "/trainer/chat", icon: ChatRoundBold },
  { title: "Dieta", url: "/trainer/diet", icon: ChefHatBold },
  { title: "Progresso", url: "/trainer/progress", icon: RulerAngularBold },
  { title: "Grupos", url: "/trainer/groups", icon: CupBold },
  { title: "TreinAI", url: "/trainer/ai-trainer", icon: BoltCircleBold },
];

export function TrainerBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More panel overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-16 left-2 right-2 z-50 md:hidden"
          >
            <div className="glass-card rounded-2xl p-3 grid grid-cols-3 gap-2 border border-border/30 shadow-xl">
              {moreLinks.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 text-muted-foreground hover:bg-primary/10 transition-all"
                  activeClassName="!text-primary !bg-primary/10"
                  onClick={() => setMoreOpen(false)}
                >
                  <item.icon size={20} color="currentColor" />
                  <span className="text-[10px] font-bold">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-white/10 bg-card/70 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)] h-16">
        {mainNav.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/trainer"}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground transition-all min-w-[56px]"
            activeClassName="!text-primary"
          >
            <item.icon size={22} color="currentColor" />
            <span className="text-[10px] font-bold leading-none">{item.title}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px] ${moreOpen ? "text-primary" : "text-muted-foreground"
            }`}
        >
          {moreOpen ? (
            <CloseCircleBold size={22} color="currentColor" />
          ) : (
            <HamburgerMenuBold size={22} color="currentColor" />
          )}
          <span className="text-[10px] font-bold leading-none">Mais</span>
        </button>
      </nav>
    </>
  );
}
