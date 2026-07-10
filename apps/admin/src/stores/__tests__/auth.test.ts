import { vi, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useAuthStore, useAuthUser, useIsAuthenticated } from "../auth";

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
  length: 0,
};
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: localStorageMock,
});

const user = { id: "1", email: "a@b.com" };

describe("auth store", () => {
  it("setAuth sets user and token", () => {
    act(() => useAuthStore.getState().setAuth(user, "token1"));
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().token).toBe("token1");
    expect(localStorage.getItem("ap-access-token")).toBe("token1");
  });

  it("isAuthenticated selector reflects state", () => {
    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(true);
  });

  it("useAuthUser selector returns user", () => {
    const { result } = renderHook(() => useAuthUser());
    expect(result.current).toEqual(user);
  });

  it("reset clears state and localStorage", () => {
    act(() => useAuthStore.getState().reset());
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("ap-access-token")).toBeNull();
  });
});
