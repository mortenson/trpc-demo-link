import { TRPCClientError, TRPCLink } from "@trpc/client";
import { AppRouter } from "../../../server";
import { inferRouterInputs } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { demoRoutes } from "./demoRoutes";

type RouterInput = inferRouterInputs<AppRouter>;

export const isUrlForDemoOrg = () => window.location.pathname.startsWith("/o/_demo");

export const demoLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const path = op.path as keyof RouterInput;
      if (isUrlForDemoOrg()) {
        if (typeof path === "string" && path in demoRoutes) {
          const ac = new AbortController();
          let result: unknown;
          try {
            // @ts-ignore
            result = demoRoutes[path](op.input, ac.signal);
          } catch (e) {
            observer.error(TRPCClientError.from(e as Error));
            return;
          }
          // Not used in this demo, but subscriptions also work
          if (result && typeof result === "object" && Symbol.asyncIterator in result) {
            observer.next({ result: { type: "started" } });
            (async () => {
              try {
                for await (const value of result as AsyncIterable<unknown>) {
                  if (ac.signal.aborted) {
                    break;
                  }
                  observer.next({ result: { type: "data", data: value } });
                }
                observer.complete();
              } catch (e) {
                if (!ac.signal.aborted) {
                  observer.error(TRPCClientError.from(e as Error));
                }
              }
            })();
          } else {
            observer.next({ result: { data: result } });
          }
          return () => ac.abort();
        } else if (
          typeof op.input === "object" &&
          op.input !== null &&
          "organizationId" in op.input
        ) {
          observer.next({
            result: {
              data: {},
            },
          });
          return;
        }
      }
      const unsubscribe = next(op).subscribe({
        error: observer.error,
        next: observer.next,
      });
      return unsubscribe;
    });
  };
};
