import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Public (publishable) backend values. Safe to ship in a static build —
// they are the same values the preview uses and are protected by RLS.
const FALLBACK_ENV = {
  VITE_SUPABASE_URL: "https://hhosrvwqfxynmapnjxeg.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TzOmy02DeIA2SnOROhj2uA_2vq5Y_ax",
  VITE_SUPABASE_PROJECT_ID: "hhosrvwqfxynmapnjxeg",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };

  // Make sure a static build (e.g. GitHub Pages) never ends up with an
  // undefined Supabase URL/key, which would crash the app to a blank screen.
  const define = Object.fromEntries(
    Object.entries(FALLBACK_ENV).map(([key, fallback]) => [
      `import.meta.env.${key}`,
      JSON.stringify(env[key] || fallback),
    ]),
  );

  return {
    // For GitHub Pages project sites set VITE_BASE_PATH="/<repo-name>/" at build time.
    base: process.env.VITE_BASE_PATH || "/",
    define,
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
