import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Sistem Absen - Attendance System",
        short_name: "Absen",
        description: "Modern & Efficient Attendance Management System",
        theme_color: "#1a56db",
        icons: [
          {
            src: "logo-pwa.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo-pwa.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "logo-pwa.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.io',
      'localhost',
    ],
  },
});
