import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./db",
  schema: "./schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "sqlite.db",
  },
});
