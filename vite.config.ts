import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src/popup"),
  base: "",
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "chrome120",
    rollupOptions: {
      input: {
        "index": resolve(__dirname, "src/popup/index.html"),
        background: resolve(__dirname, "src/background/main.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          return "[name].js";
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "style.css";
          return "[name][extname]";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
  publicDir: resolve(__dirname, "public"),
});
