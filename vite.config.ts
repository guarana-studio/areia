import path from "node:path";

import { pages } from "@ilha/router/vite";
import nodepod from "@scelar/nodepod/vite";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [pages(), nodepod(), tailwindcss(), nitro()],
  nitro: {
    serverDir: "./src",
  },
  resolve: {
    alias: {
      $assets: path.resolve(import.meta.dirname, "src", "assets"),
      $lib: path.resolve(import.meta.dirname, "src", "lib"),
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
