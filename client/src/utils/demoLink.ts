import { TRPCClientError, TRPCLink } from "@trpc/client";
import { AppRouter } from "../../../server";
import { getTRPCErrorFromUnknown, inferRouterInputs } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { observable } from "@trpc/server/observable";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import { demoRoutes } from "./demoRoutes";

type RouterInput = inferRouterInputs<AppRouter>;

// Allows demo routes to throw server-like TRPCErrors without doing
// this work themselves.
const toClientError = (cause: unknown, path: string) => {
  const error = getTRPCErrorFromUnknown(cause);
  return TRPCClientError.from<AppRouter>({
    error: {
      message: error.message,
      code: TRPC_ERROR_CODES_BY_KEY[error.code],
      data: {
        code: error.code,
        httpStatus: getHTTPStatusCodeFromError(error),
        path,
      },
    },
  });
};

// Determines if the user is viewing the demo
// You could also check the contents of op.input, but you may want to mock
// routes that aren't organization-specific as well.
export const isUrlForDemoOrg = () => window.location.pathname.startsWith("/o/_demo");

export const demoLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const path = op.path as keyof RouterInput;
      // Are we in the demo?
      if (isUrlForDemoOrg()) {
        // Did we mock this route?
        if (path in demoRoutes) {
          const ac = new AbortController();
          let result: unknown;
          try {
            // @ts-ignore
            result = demoRoutes[path](op.input, ac.signal);
          } catch (e) {
            observer.error(toClientError(e, path));
            return;
          }
          // Not used in this demo, but subscriptions are also supported
          // if the DemoRoute returns an AsyncGenerator
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
                  observer.error(toClientError(e, path));
                }
              }
            })();
          } else {
            observer.next({ result: { data: result } });
            observer.complete();
          }
          return () => ac.abort();
        // If we didn't mock the route, but the input has a slug, the response
        // type for this route must be "{}" and we can just return that now.
        } else if (typeof op.input === "object" && op.input !== null && "slug" in op.input) {
          observer.next({
            result: {
              data: {},
            },
          });
          return;
        }
      }
      const unsubscribe = next(op).subscribe(observer);
      return unsubscribe;
    });
  };
};
