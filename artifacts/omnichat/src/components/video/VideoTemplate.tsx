import { motion, AnimatePresence } from "framer-motion";
import { useVideoPlayer } from "@/lib/video/hooks";
import { Scene1 } from "./video_scenes/Scene1";
import { Scene2 } from "./video_scenes/Scene2";
import { Scene3 } from "./video_scenes/Scene3";
import { Scene4 } from "./video_scenes/Scene4";
import { Scene5 } from "./video_scenes/Scene5";
import { Scene6 } from "./video_scenes/Scene6";
import { Scene7 } from "./video_scenes/Scene7";

const SCENE_DURATIONS = {
  open: 4000,
  landing: 7000,
  login: 5000,
  inbox: 10000,
  channels: 6000,
  analytics: 7000,
  close: 6000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f0f23] text-white">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
          animate={{
            x: ["-10%", "50%", "10%"],
            y: ["10%", "-20%", "40%"],
            scale: [1, 1.2, 0.8],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-[80px] right-0 bottom-0"
          style={{ background: "radial-gradient(circle, #6d28d9, transparent)" }}
          animate={{
            x: ["10%", "-40%", "20%"],
            y: ["-10%", "-50%", "-10%"],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="open" />}
        {currentScene === 1 && <Scene2 key="landing" />}
        {currentScene === 2 && <Scene3 key="login" />}
        {currentScene === 3 && <Scene4 key="inbox" />}
        {currentScene === 4 && <Scene5 key="channels" />}
        {currentScene === 5 && <Scene6 key="analytics" />}
        {currentScene === 6 && <Scene7 key="close" />}
      </AnimatePresence>
    </div>
  );
}
