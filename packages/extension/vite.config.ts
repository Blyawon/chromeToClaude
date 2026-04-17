import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import manifest from "./manifest.config.ts";

export default defineConfig({
  resolve: {
    alias: {
      "@chrome-to-claude/shared": resolve(__dirname, "../shared/protocol.ts"),
      "@ui": resolve(__dirname, "src/ui"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: resolve(__dirname, "src/options/options.html"),
      },
    },
  },
  plugins: [react(), crx({ manifest })],
});
