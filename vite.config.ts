/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "splash_screens/icon.png"],
      manifest: {
        name: "ChurchFoundry",
        short_name: "ChurchFoundry",
        description: "PWA for church management — members, inventory, rooms, and ministries",
        theme_color: "#0A0A0A",
        background_color: "#0A0A0A",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        lang: "uk",
        icons: [
          {
            src: "splash_screens/icon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "splash_screens/icon.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "splash_screens/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
})
