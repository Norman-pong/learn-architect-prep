import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { setThemeMode, useThemeMode, useThemeStore, type ThemeMode } from "../theme";

describe("theme store", () => {
  it("selector narrows to mode only", () => {
    const { result } = renderHook(() => useThemeMode());
    expect(result.current[0]).toBe("system");
  });

  it("setThemeMode changes state and syncs DOM", () => {
    act(() => setThemeMode("dark"));
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => setThemeMode("light"));
    expect(useThemeStore.getState().mode).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("cycle and reset behavior", () => {
    act(() => setThemeMode("system"));
    expect(useThemeStore.getState().mode).toBe("system");

    const modes: ThemeMode[] = [];
    act(() => {
      setThemeMode("dark");
      modes.push(useThemeStore.getState().mode);
    });
    expect(useThemeStore.getState().mode).toBe("dark");

    act(() => setThemeMode("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
