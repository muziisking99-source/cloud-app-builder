import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Something went wrong loading data");
      },
    }),
    mutationCache: new MutationCache({
      // Mutations with their own onError (optimistic rollbacks) still surface here;
      // only toast when the mutation didn't handle it itself.
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.onError) return;
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
  });

  return router;
};
