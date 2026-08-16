import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Service worker + manifest are only useful (and only testable) on a
      // real build — Caddy's no-cache rule on everything outside /assets/*
      // (see client/Caddyfile) already makes sure both are always
      // revalidated in production, so there's nothing extra to configure
      // there.
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Dafsolt BOS for School",
        short_name: "Dafsolt BOS",
        description: "The complete operating system for your school — academics, finance, CBT, HR and more, in one place.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2E3192",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Long-press/right-click on the installed icon — CBT exam-hall
        // kiosk stations are a distinct real-world workflow worth
        // surfacing directly (see AppLayout's sidebar link and the
        // landing page footer for the other two places this is linked).
        shortcuts: [
          {
            name: "CBT Exam Kiosk",
            short_name: "Exam Kiosk",
            url: "/kiosk/login",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        // Precache only the built app shell (JS/CSS/HTML/icons). Never
        // precache or runtime-cache /api/** — tenant data is dynamic and
        // per-user; nothing here should ever serve a cached API response.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
