import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextValue {
  mode: "light" | "dark";
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("archprep-theme") as "light" | "dark" | null;
    if (saved === "light" || saved === "dark") {
      setMode(saved);
    }
  }, []);

  const toggle = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem("archprep-theme", next);
      return next;
    });
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>
    </ConfigProvider>
  );
}
