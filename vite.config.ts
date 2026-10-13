import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "learnos-offline",
        apply: "build",
        writeBundle(options, bundle) {
          const assets = [
            "/",
            "/favicon.svg",
            "/manifest.webmanifest",
            ...Object.keys(bundle).map((name) => `/${name}`),
          ];
          const version = createHash("sha256")
            .update(JSON.stringify(assets))
            .digest("hex")
            .slice(0, 12);
          const template = readFileSync(
            path.resolve(import.meta.dirname, "public/sw.js"),
            "utf8",
          );
          writeFileSync(
            path.resolve(options.dir ?? "dist", "sw.js"),
            template
              .replace('"__PRECACHE__"', JSON.stringify(assets))
              .replace("__VERSION__", version),
          );
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
