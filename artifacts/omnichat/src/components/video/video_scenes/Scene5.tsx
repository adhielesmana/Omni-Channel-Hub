import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import channelsImg from "@assets/channels.jpg";

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, rotate: 5, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2 pr-12">
        <motion.h2
          className="text-[4vw] font-bold leading-tight mb-6"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Connect <span className="text-violet-400">Every Network</span>
        </motion.h2>
        <motion.p
          className="text-[1.5vw] text-violet-200 opacity-80"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          WhatsApp, Instagram, Facebook Messenger and more.
        </motion.p>
      </div>

      <motion.div
        className="w-1/2 relative perspective-1000"
        initial={{ opacity: 0, rotateY: 15, scale: 0.9 }}
        animate={phase >= 2 ? { opacity: 1, rotateY: -10, scale: 1 } : { opacity: 0, rotateY: 15, scale: 0.9 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10">
          <img src={channelsImg} alt="Channels Page" className="w-full h-auto object-cover" />
        </div>
      </motion.div>
    </motion.div>
  );
}
