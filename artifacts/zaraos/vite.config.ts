import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// ── Environment resolution ──────────────────────────────────────────────────
//
// All values have safe defaults so the project builds and runs on any machine
// without needing Replit-provided environment variables.
//
// Replit's workflow system sets PORT and BASE_PATH in artifact.toml, which
// overrides these defaults when running inside Replit. But they are never
// *required* — the app is fully portable.
//
//   PORT      default 5173  (Vite's own default dev port)
//   BASE_PATH default "/"   (root-mounted, correct for any standalone deploy)

const rawPort = process.env.PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
  ? Number(rawPort)
  : 5173;

const basePath = process.env.BASE_PATH || "/";

// Replit-only dev plugins are loaded only when running inside Replit.
// Outside Replit (GitHub clone, local dev, CI, Tauri build) they are skipped.
const isReplitEnv = process.env.REPL_ID !== undefined;
const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(isDev && isReplitEnv
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then(
            (m) => m.default(),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split vendor code into stable long-cache chunks.
        // App page chunks are created automatically by React.lazy() imports.
        manualChunks(id) {
          // Core React runtime — almost never changes, cache indefinitely
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // Routing + data fetching — stable deps
          if (
            id.includes("node_modules/wouter/") ||
            id.includes("node_modules/@tanstack/")
          ) {
            return "vendor-react";
          }
          // UI component library — Radix primitives + animations + icons
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/framer-motion/") ||
            id.includes("node_modules/class-variance-authority/") ||
            id.includes("node_modules/clsx/") ||
            id.includes("node_modules/tailwind-merge/")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
