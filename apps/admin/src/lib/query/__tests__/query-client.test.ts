import { describe, expect, it } from "vitest";
import { queryClient } from "../../query-client";

describe("queryClient", () => {
  it("has correct default query options", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(10_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });

  it("retries on generic errors up to 2 times", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    const retry = defaults?.retry;
    expect(typeof retry).toBe("function");
    if (typeof retry !== "function") return;
    expect(retry(0, new Error("network"))).toBe(true);
    expect(retry(1, new Error("network"))).toBe(true);
    expect(retry(2, new Error("network"))).toBe(false);
  });

  it("does not retry on 401/403", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    const retry = defaults?.retry;
    if (typeof retry !== "function") return;
    const err401 = Object.assign(new Error("Unauthorized"), { status: 401 });
    const err403 = Object.assign(new Error("Forbidden"), { status: 403 });
    expect(retry(0, err401)).toBe(false);
    expect(retry(0, err403)).toBe(false);
  });
});
