import { useState, useEffect } from "react";

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  const keys = Object.keys(durations);

  useEffect(() => {
    // @ts-ignore
    window.startRecording?.();

    let isCancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const playScene = (index: number) => {
      if (isCancelled) return;
      setCurrentScene(index);

      const nextIndex = (index + 1) % keys.length;
      if (index === keys.length - 1) {
        // @ts-ignore
        window.stopRecording?.();
      }

      timeout = setTimeout(() => {
        playScene(nextIndex);
      }, durations[keys[index]]);
    };

    playScene(0);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, []); // durations assumed static

  return { currentScene };
}
