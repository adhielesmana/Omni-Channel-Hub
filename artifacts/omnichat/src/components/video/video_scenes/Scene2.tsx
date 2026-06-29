import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import landingImg from "@assets/landing.jpg";

export function Scene2() {
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
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-10"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2 pr-12">
        <motion.h2
          className="text-[4vw] font-bold leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Unify your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">customer experience</span>
        </motion.h2>
      </div>

      <motion.div
        className="w-1/2 relative perspective-1000"
        initial={{ opacity: 0, rotateY: 20, x: 50, scale: 0.8 }}
        animate={phase >= 2 ? { opacity: 1, rotateY: -5, x: 0, scale: 1 } : { opacity: 0, rotateY: 20, x: 50, scale: 0.8 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl shadow-violet-500/20 border border-white/10">
          <img src={landingImg} alt="Landing Page" className="w-full h-auto object-cover" />
        </div>
      </motion.div>
    </motion.div>
  );
}
