
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: disable aggressive refetching
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403/404 errors
        if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2; // Retry twice for other errors
      },
    },
  },
});

export default queryClient;
