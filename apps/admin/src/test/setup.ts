import { vi } from "vitest";
import "@testing-library/jest-dom";

// window.matchMedia → antd ResponsiveObserver 用
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// ResizeObserver → antd Table / Layout 用
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
}

// IntersectionObserver 同样需要（多个 antd 子组件用）
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
if (typeof globalThis.IntersectionObserver === "undefined") {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

// window.getComputedStyle(el, pseudoElt) → jsdom 不实现，0px 兜底
const originalGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  if (pseudoElt) return { width: "0px" } as CSSStyleDeclaration;
  return originalGetComputedStyle(elt);
};

// Element.prototype.scrollTo → antd Table 滚动用
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function () {};
}

// localStorage mock
const localStorageMock: Storage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
  key: vi.fn(() => null),
  length: 0,
};
Object.defineProperty(window, "localStorage", {
  configurable: true,
  writable: true,
  value: localStorageMock,
});
