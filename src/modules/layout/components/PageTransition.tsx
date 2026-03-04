import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}
