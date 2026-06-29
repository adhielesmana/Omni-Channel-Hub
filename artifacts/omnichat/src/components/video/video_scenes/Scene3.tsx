import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import loginImg from "@assets/login.jpg";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-row-reverse items-center justify-between px-[10vw] z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-2/5 pl-12">
        <motion.h2
          className="text-[4vw] font-bold leading-tight mb-6"
          initial={{ opacity: 0, x: 30 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Secure & <span className="text-violet-400">Seamless</span> Access
        </motion.h2>
      </div>

      <motion.div
        className="w-3/5 relative perspective-1000"
        initial={{ opacity: 0, rotateY: -15, z: -100 }}
        animate={phase >= 2 ? { opacity: 1, rotateY: 5, z: 0 } : { opacity: 0, rotateY: -15, z: -100 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl shadow-violet-500/10 border border-white/10">
          <img src={loginImg} alt="Login Page" className="w-full h-auto object-cover" />
        </div>
      </motion.div>
    </motion.div>
  );
}
