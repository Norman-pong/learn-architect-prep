import { useState, useEffect } from "react";

/**
 * Returns `true` when the viewport width is below the "md" breakpoint (768px).
 *
 * This hook is SSR-safe: it defaults to `false` and only measures in the browser.
 * Use it to choose between mobile and desktop layouts (e.g. Drawer vs fixed sidebar).
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
