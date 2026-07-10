import { QueryClient, QueryCache } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        localStorage.removeItem("ap-access-token");
        localStorage.removeItem("ap-refresh-token");
        if (typeof window !== "undefined") {
          window.location.assign("/login");
        }
      }
    },
  }),
});
