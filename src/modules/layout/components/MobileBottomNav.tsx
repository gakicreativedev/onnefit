import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  HomeBold,
  DumbbellBold,
  ChefHatBold,
  UsersGroupTwoRoundedBold,
  HamburgerMenuBold,
  BoltCircleBold,
  ChefHatHeartBold,
  CupBold,
  CloseCircleBold,
  RulerAngularBold,
} from "solar-icon-set";
import { AnimatePresence, motion } from "framer-motion";

const bottomNav = [
  { title: "Home", url: "/", icon: HomeBold },
  { title: "Treino", url: "/workouts", icon: DumbbellBold },
  { title: "Feed", url: "/social", icon: UsersGroupTwoRoundedBold },
  { title: "Dieta", url: "/diet", icon: ChefHatBold },
];

const moreLinks = [
  { title: "TreinAI", url: "/ai-trainer", icon: BoltCircleBold },
  { title: "DietAI", url: "/ai-chef", icon: ChefHatHeartBold },
  { title: "Grupos", url: "/groups", icon: CupBold },
  { title: "Progresso", url: "/progress", icon: RulerAngularBold },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isMoreActive = moreLinks.some((l) => location.pathname.startsWith(l.url));

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] md:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: 64, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 64, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="fixed bottom-[68px] left-0 right-0 z-[70] md:hidden px-3 pb-2"
            >
              <div className="rounded-2xl glass-card p-3 shadow-2xl">
                <div className="grid grid-cols-3 gap-2">
                  {moreLinks.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                      activeClassName="!text-primary !bg-primary/10"
                    >
                      <item.icon size={22} color="currentColor" />
                      <span className="text-[10px] font-bold leading-none">{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border/50 bg-card/90 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)] h-[68px] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        {bottomNav.map((item) => {
          const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              onClick={() => setMoreOpen(false)}
              className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground transition-all min-w-[56px]"
              activeClassName="!text-primary"
            >
              <motion.div
                animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <item.icon size={22} color="currentColor" />
              </motion.div>
              <span className="text-[10px] font-bold leading-none">{item.title}</span>
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-0.5 h-1 w-4 rounded-full bg-primary glow-primary-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen((prev) => !prev)}
          className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px] ${moreOpen || isMoreActive ? "text-primary" : "text-muted-foreground"
            }`}
        >
          <motion.div animate={moreOpen ? { rotate: 90 } : { rotate: 0 }} transition={{ duration: 0.2 }}>
            {moreOpen ? (
              <CloseCircleBold size={22} color="currentColor" />
            ) : (
              <HamburgerMenuBold size={22} color="currentColor" />
            )}
          </motion.div>
          <span className="text-[10px] font-bold leading-none">Mais</span>
          {isMoreActive && !moreOpen && (
            <motion.div
              className="absolute -bottom-0.5 h-1 w-4 rounded-full bg-primary glow-primary-sm"
            />
          )}
        </button>
      </nav>
    </>
  );
}
