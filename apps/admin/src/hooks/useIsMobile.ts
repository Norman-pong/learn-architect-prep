import { useState, useEffect } from "react";

/**
 * Returns true when the viewport is narrower than the "md" breakpoint (768px).
 * Ssr-safe: defaults to false and only updates in the browser.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export default useIsMobile;
