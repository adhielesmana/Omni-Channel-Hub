import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import analyticsImg from "@assets/analytics.jpg";

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center pt-10 z-10"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2
        className="text-[3.5vw] font-bold text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        Insights that <span className="text-violet-400">Drive Growth</span>
      </motion.h2>

      <motion.div
        className="relative w-[85vw] max-w-[1400px] perspective-1000"
        initial={{ opacity: 0, rotateX: 30, scale: 0.8 }}
        animate={phase >= 2 ? { opacity: 1, rotateX: 5, scale: 1 } : { opacity: 0, rotateX: 30, scale: 0.8 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10">
          <img src={analyticsImg} alt="Analytics Dashboard" className="w-full h-auto object-cover" />
        </div>
      </motion.div>
    </motion.div>
  );
}
