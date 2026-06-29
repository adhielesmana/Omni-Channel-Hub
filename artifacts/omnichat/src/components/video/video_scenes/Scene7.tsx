import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 50, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative">
        <motion.div
          className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/20"
          initial={{ scale: 0, rotate: 45 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 45 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </motion.div>
      </div>

      <motion.h1
        className="text-[4vw] font-bold tracking-tight mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        OmniChat
      </motion.h1>

      <motion.p
        className="text-[1.5vw] text-violet-200 mb-12"
        initial={{ opacity: 0, y: 10 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        One inbox for every channel
      </motion.p>

      <motion.div
        className="px-8 py-4 bg-white text-violet-900 rounded-full font-bold text-[1.2vw] shadow-lg shadow-white/10"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        Get started free
      </motion.div>
    </motion.div>
  );
}
