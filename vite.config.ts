import { resolve, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** In dev, serve album.html for /albums/<slug>/ (the production build writes a page per album). */
function albumRoutes(): Plugin {
  return {
    name: "tours:album-routes",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const m = req.url?.match(/^\/albums\/[a-z0-9-]+\/?(\?.*)?$/);
        if (m) req.url = `/album.html${m[1] ?? ""}`;
        next();
      });
    },
  };
}

/** In dev, rebuild the manifest and media whenever anything under albums/ changes. */
function watchAlbums(): Plugin {
  return {
    name: "tours:watch-albums",
    apply: "serve",
    configureServer(server) {
      const albumsDir = resolve(import.meta.dirname, "albums") + sep;
      let timer: ReturnType<typeof setTimeout> | undefined;
      server.watcher.on("all", (_event, file) => {
        if (!resolve(file).startsWith(albumsDir)) return;
        clearTimeout(timer);
        timer = setTimeout(async () => {
          // Imported lazily so sharp is only loaded when the dev server needs it.
          const { buildContent } = await import("./scripts/lib/content.ts");
          try {
            await buildContent({ log: (m) => server.config.logger.info(m) });
          } catch (err) {
            server.config.logger.error(err instanceof Error ? err.message : String(err));
          }
        }, 300);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    albumRoutes(),
    watchAlbums(),
    VitePWA({
      // Silently installs updates in the background and activates them on next load.
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        id: "/",
        scope: "/",
        start_url: "/",
        name: "Marty Kokes · Tours",
        short_name: "Tours",
        description: "360° photo albums by Marty Kokes.",
        theme_color: "#242424",
        background_color: "#242424",
        display: "standalone",
        categories: ["photo", "travel"],
        // Icons are generated from public/favicon.svg by `npm run generate-pwa-assets`.
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Each album has its own page (written after the Vite build), so there's no SPA fallback.
        // Pages aren't precached; the navigation rule below keeps them fresh with an offline copy.
        navigateFallback: null,
        // Precache the app shell: scripts, styles, fonts and icons. Panoramas are cached on view.
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2,webmanifest}"],
        globIgnores: ["media/**"],
        runtimeCaching: [
          {
            // Pages: always fetch the latest, fall back to the last copy when offline.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "tours-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50 },
            },
          },
          {
            // Processed photos. URLs carry a content hash (?v=), so a cached copy never goes stale.
            urlPattern: ({ url }) => url.pathname.startsWith("/media/"),
            handler: "CacheFirst",
            options: {
              cacheName: "tours-media",
              expiration: { maxEntries: 120, maxAgeSeconds: 90 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        album: resolve(import.meta.dirname, "album.html"),
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
