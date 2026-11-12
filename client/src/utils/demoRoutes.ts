import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "../../../server";
import { TRPCClientError } from "@trpc/client";

type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

type OrganizationInputShape = {
  slug: string;
};

type EmptyShape = {
  [key: string]: never;
};

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
    const report = this.store.get(id);
    if (!report) {
      throw TRPCClientError.from({ message: "Not Found", code: "NOT_FOUND" });
    }
    return report;
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

const postsStore = new DataStore<RouterOutput["listPosts"][number]>([
  {
    id: crypto.randomUUID(),
    text: "This is a demo post",
  },
  {
    id: crypto.randomUUID(),
    text: "And here is another",
  },
]);

// "stable" UUIDs are often useful for full page refreshes of the in-memory demo
const demoUuid = crypto.randomUUID();

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
  // ignorableRoute is not required here as it return an empty object ({})
  // createOrganization and all other routes that do not consume a slug also are optional for mocking
};
