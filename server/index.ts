import { initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import cors from "cors";
import { z } from "zod";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { organizations, posts } from "./schema";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const appRouter = router({
  createOrganization: publicProcedure
    .input(
      z.object({
        slug: z
          .string()
          .regex(
            /^[a-z0-9]+[a-z0-9-]+[a-z0-9]+$/,
            "Slug can only contain lowercase letters, numbers, and hyphens, between 3-30 chars long",
          ),
        name: z.string().nonempty(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug,
        })
        .onConflictDoNothing()
        .returning();
      if (result.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That organization already exists" });
      }
      return {};
    }),
  createPost: publicProcedure
    .input(
      z.object({
        slug: z.string().nonempty(),
        text: z.string().nonempty(),
      }),
    )
    .mutation(async ({ input }) => {
      const organization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));
      if (organization.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }
      const result = await db
        .insert(posts)
        .values({
          organizationId: organization[0].id,
          text: input.text,
        })
        .returning();
      if (result.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return {
        postId: result[0].id,
      };
    }),
  getOrganization: publicProcedure
    .input(
      z.object({
        slug: z.string().nonempty(),
      }),
    )
    .query(async ({ input }) => {
      const organization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));
      if (organization.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }
      return {
        id: organization[0].id,
        slug: organization[0].slug,
        name: organization[0].name,
      };
    }),
  listPosts: publicProcedure
    .input(
      z.object({
        slug: z.string().nonempty(),
      }),
    )
    .query(async ({ input }) => {
      const organization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));
      if (organization.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }
      const result = await db
        .select()
        .from(posts)
        .where(eq(posts.organizationId, organization[0].id))
        .orderBy(asc(posts.createdAt));
      return result.map((p) => ({
        id: p.id,
        text: p.text,
      }));
    }),
  ignorableRoute: publicProcedure
    .input(
      z.object({
        slug: z.string().nonempty(),
        text: z.string().nonempty(),
      }),
    )
    .mutation(async () => {
      return {};
    }),
});

export type AppRouter = typeof appRouter;

console.log("server listening on ::2012");

createHTTPServer({
  middleware: cors(),
  router: appRouter,
  onError({ error, path }) {
    console.error(`Error in tRPC handler on path '${path}':`, error);
  },
}).listen(2012);
