import { resolve, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";

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
  plugins: [albumRoutes(), watchAlbums()],
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
