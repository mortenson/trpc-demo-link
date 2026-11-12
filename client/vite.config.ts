import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3012,
  },
  preview: {
    port: 3012,
  },
  plugins: [react()],
});
