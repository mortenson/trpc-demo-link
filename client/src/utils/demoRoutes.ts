import { inferRouterInputs, inferRouterOutputs, TRPCError } from "@trpc/server";
import { AppRouter } from "../../../server";

type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

// The shape of HTTP requests for an organization
type OrganizationInputShape = {
  slug: string;
};

// Allows us to identify routes that return "{}"
type EmptyShape = {
  [key: string]: never;
};

// A callback that consumes the route input and returns a mock
// of the given route output.
type DemoDataGenerator<T extends keyof RouterInput> =
  | ((input: RouterInput[T], signal?: AbortSignal) => RouterOutput[T])
  // Not used in this demo, but subscriptions also work
  | ((
      input: RouterInput[T],
      signal?: AbortSignal,
    ) => AsyncGenerator<{
      id: string;
      data: RouterOutput[T];
    }>);

// A string union of route names that are organization-specific.
type OrganizationRoute = {
  [T in keyof RouterInput]: RouterInput[T] extends OrganizationInputShape ? T : never;
}[keyof RouterInput];

type DemoRoutes = {
  [T in OrganizationRoute as RouterOutput[T] extends EmptyShape ? never : T]: DemoDataGenerator<T>;
} & {
  [T in OrganizationRoute as RouterOutput[T] extends EmptyShape ? T : never]?: DemoDataGenerator<T>;
};

interface HasId {
  id: string;
}

// Totally optional but I found that having a utility to store
// demo data in memory is pretty useful.
class DataStore<T extends HasId> {
  private store = new Map<string, T>();

  constructor(items: T[]) {
    this.store = new Map(items.map((i) => [i.id, i]));
  }

  create(item: T): T {
    this.store.set(item.id, item);
    return item;
  }

  get(id: string): T {
    const item = this.store.get(id);
    if (!item) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Not Found" });
    }
    return item;
  }

  list(filterFn?: (item: T) => boolean): T[] {
    const items = Array.from(this.store.values());
    return filterFn ? items.filter(filterFn) : items;
  }

  update(id: T["id"], updates: Partial<Omit<T, "id">>): T {
    const existing = this.get(id);
    const defined = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    const updated = { ...existing, ...defined } as T;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: T["id"]): boolean {
    return this.store.delete(id);
  }
}

// I usually type DataStore based on response/output types
const postsStore = new DataStore<RouterOutput["listPosts"][number]>([
  {
    id: crypto.randomUUID(),
    text: "This is a demo post",
  },
  {
    id: crypto.randomUUID(),
    text: "You can submit new posts here, but they're just stored in memory",
  },
]);

// "stable" UUIDs are often useful for full page refreshes of the in-memory demo
const demoUuid = crypto.randomUUID();

// Finally - the mocked routes. Due to the complex types above, you'll get type
// errors if you don't mock a route that consumes a "slug" and produces a non-empty
// response.
//
// Those optional routes can also be mocked if needed.
export const demoRoutes: DemoRoutes = {
  getOrganization: () => ({
    id: demoUuid,
    name: "Demo Org",
    slug: "_demo",
  }),
  createPost: (i) => {
    const id = crypto.randomUUID();
    postsStore.create({ id: id, text: i.text });
    return { postId: id };
  },
  listPosts: () => postsStore.list(),
  // ignorableRoute and createOrganization are not required here as they return an empty object ({})
};
