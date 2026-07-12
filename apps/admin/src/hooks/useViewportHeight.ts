import { useEffect, useState } from "react";

/**
 * Returns the current window innerHeight in pixels (0 before mount, no
 * dependency on CSS vars). Use to bind --app-h CSS var on a wrapper so
 * children can use `h-[calc(var(--app-h)-3.5rem)]` for layouts that were
 * previously `h-[calc(100vh-3.5rem)]`. 100vh is unreliable on iOS Safari
 * (includes the URL bar/toolbar); we use a JS-driven height instead.
 */
export function useViewportHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const update = () => setH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return h;
}

export default useViewportHeight;
