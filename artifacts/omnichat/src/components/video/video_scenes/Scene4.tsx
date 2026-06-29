import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import inboxImg from "@assets/inbox.jpg";
import mobileImg from "@assets/IMG_4491_1782661744339.png";

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 8500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center pt-20 z-10"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.2, filter: "blur(15px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2
        className="text-[3vw] font-bold text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        The Ultimate <span className="text-violet-400">3-Pane Workspace</span>
      </motion.h2>

      <div className="relative w-[80vw] max-w-[1200px] h-[50vh] perspective-1000">
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10"
          initial={{ opacity: 0, rotateX: 20, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, rotateX: 0, y: 0 } : { opacity: 0, rotateX: 20, y: 50 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={inboxImg} alt="Inbox Workspace" className="w-full h-full object-cover object-top" />
        </motion.div>

        <motion.div
          className="absolute -bottom-10 -right-10 w-[20vw] rounded-xl overflow-hidden shadow-2xl border border-white/20"
          initial={{ opacity: 0, x: 50, y: 50 }}
          animate={phase >= 3 ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: 50, y: 50 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <img src={mobileImg} alt="Mobile Inbox" className="w-full h-auto object-cover" />
        </motion.div>
      </div>
    </motion.div>
  );
}
