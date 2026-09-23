import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: path.resolve(import.meta.dirname, "client", "src"),
      filename: "pwa-sw.ts",
      injectManifest: {
        injectionPoint: undefined,
        manifestTransforms: [],
        additionalManifestEntries: [],
        globPatterns: ["**/*.{js,css,html,json,ico,png,svg,woff,woff2,ttf,otf}"],
        globIgnores: ["**/node_modules/**/*", "**/sw.js", "**/*.map"],
        globDirectory: path.resolve(import.meta.dirname, "dist", "public"),
        maximumFileSizeToCacheInBytes: 2.5 * 1024 * 1024,
      },
      injectRegister: "auto",
      includeAssets: [
        "/favicon.png",
        "/logo-duan.png",
        "/pwa-icon-192.png",
        "/pwa-icon-512.png",
        "/pwa-icon-maskable-512.png",
        "/apple-touch-icon.png",
      ],
      manifest: {
        id: "/?pwa=1",
        name: "Kinh điển phương Đông — Quản lý dự án",
        short_name: "KDPD",
        description:
          "Hệ thống Quản lý dự án Văn phòng Dự án Kinh điển phương Đông — Quản lý công việc, biên tập, thiết kế, CNTT, thư ký hợp phần, hợp đồng dịch thuật và hiệu đính sách kinh điển.",
        lang: "vi",
        dir: "ltr",
        scope: "/",
        start_url: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        orientation: "portrait-primary",
        background_color: "#f6f0e0",
        theme_color: "#8b6f3f",
        categories: ["business", "productivity", "education", "books"],
        prefer_related_applications: false,
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Công việc chung",
            short_name: "CV chung",
            description: "Truy cập nhanh trang Công việc chung",
            url: "/cv-chung",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Tổng quan hệ thống",
            url: "/",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        hoistTransitiveImports: false,
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/node_modules\/xlsx\b/.test(id)) return "vendor-xlsx";
            if (/node_modules\/@tanstack\/react-query\b/.test(id))
              return "vendor-tanstack";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
