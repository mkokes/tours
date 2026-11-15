# AGENTS.md

Context for AI coding agents working in this repo. Human-facing overview: [README.md](README.md). Visual style: the shared mk-styleguide, vendored in [styleguide/](styleguide/STYLEGUIDE.md).

## What this is

Marty Kokes's 360° photo albums ([tours.martykokes.com](https://tours.martykokes.com)). It's a static multi-page site built with Vite and vanilla TypeScript (no framework) on [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/) 5. It installs as a PWA and is deployed to GitHub Pages.

## Layout

```
albums/<slug>/          Source photos (committed originals) + optional album.yml
scripts/
  build-content.ts      CLI: runs lib/content.ts
  build-pages.ts        Post-build: dist/albums/<slug>/index.html (og tags), 404.html, sitemap.xml
  lib/content.ts        Scans albums, reads EXIF, resizes with sharp, writes the manifest
  lib/resolve.ts        Pure album rules: defaults, ordering, ids, GPS hiding (unit tested)
  lib/pages.ts          Fills the album page template (og tags, noindex)
  lib/resolve.test.ts   Vitest tests for resolve.ts, schema.ts and pages.ts
src/
  home.ts, album.ts     Page entry points (index.html, album.html)
  layout.ts             Fonts, styleguide tokens, header/footer (nav mirrors martykokes.com), theme toggle
  theme.ts              Light / System / Dark preference (localStorage "theme")
  manifest.ts           Typed import of src/generated/albums.json
  content/types.ts      Manifest types (shared by scripts and the client)
  content/schema.ts     zod schema for album.yml
  viewer/setup.ts       Viewer + plugins (virtual tour, gallery, markers, plan, autorotate)
  viewer/meta-panel.ts  Photo details under the viewer
  viewer/editor.ts      Dev-only hotspot editor
  styles/site.css       Site styles on the styleguide role variables
styleguide/             Vendored mk-styleguide (don't edit)
public/                 CNAME, favicon, PWA icons, robots.txt
pwa-assets.config.ts    Icon generation from public/favicon.svg
vite.config.ts          Multi-page build, dev routing + albums watcher, VitePWA
```

Generated and gitignored: `src/generated/albums.json`, `public/media/<slug>/<photo-id>/{pano.jpg,preview.jpg,thumb.webp}` and `.cache/content.json` (content hashes).

## Commands

```bash
npm ci                       # install (Node 22, as in CI)
npm run dev                  # content build, then Vite dev server (rebuilds on albums/ changes)
npm run content              # just the content build
npm test                     # Vitest, single run
npm run lint                 # oxlint
npm run format               # oxfmt (write)
npm run format:check         # oxfmt (check)
npm run build                # content → tsc → vite build → build-pages
npm run generate-pwa-assets  # regenerate icons after changing public/favicon.svg
```

CI (`.github/workflows/pages.yml`) runs lint, format check, tests and build on every PR and push, and deploys `main` to GitHub Pages. It caches `public/media` and `.cache` keyed on `albums/**`. There are no git hooks.

## Conventions

- **Content lives in `albums/`.** Each folder is an album, and `album.yml` is optional. The schema in `src/content/schema.ts` uses strict objects, so unknown keys fail the build. Keep the README's `album.yml` reference in step with it.
- **Album rules belong in `scripts/lib/resolve.ts`** (pure, tested), not in the client. The client only renders `albums.json`.
- **Privacy:** published images must never carry metadata. sharp drops EXIF/XMP/GPS unless `withMetadata`/`withExif` is called; don't add either. `hideLocation` must remove GPS from the manifest, not just hide the map.
- **Coordinates:** yaw and pitch are in radians. GPS in the manifest and in Photo Sphere Viewer is `[lon, lat]`; in `album.yml` it is `{ lat, lon }`.
- **Photo ids** come from filenames (`photoId()`), are used in `?p=` and media paths, and must be unique within an album.
- **Changing the image pipeline** (sizes, quality, format): bump `PIPELINE_VERSION` in `scripts/lib/content.ts` so cached outputs are rebuilt.
- **Styling** follows `styleguide/STYLEGUIDE.md`. Use the role variables (`--color-bg`, `--color-text`, `--color-link`, `--color-primary`, …). Lime is a fill only; lime-coloured text uses `--color-link`. The viewer is always dark, so `src/viewer/viewer.css` uses fixed charcoal and lime. Don't edit `styleguide/`; copy new versions from mk-styleguide.
- **Theme:** the inline script in `index.html` and `album.html` reads the same `localStorage` key as `src/theme.ts`; keep them in step. Wrap `localStorage` access in try/catch.
- **HTML from text:** escape everything with `esc()` (`src/format.ts`). The exception is marker `content` from `album.yml`, which is author-written HTML by design.
- **Dev-only code** goes behind `import.meta.env.DEV` with a dynamic import, so it's dropped from production builds (see the editor in `src/album.ts`).
- Formatting is oxfmt; don't hand-format against it.
- **Navigation** is shared with martykokes.com: `navItems` in `src/layout.ts` must keep the same items and order as `navItems` in martykokes's `src/components/SiteLayout.tsx`. Links back to the main site are same-tab, so the two read as one site.
- Record user-facing changes in [CHANGELOG.md](CHANGELOG.md) under Unreleased.

## Gotchas

- **`three` must match the version `@photo-sphere-viewer/core` depends on** (currently 0.185.1). Otherwise npm installs two copies, and the plugins and the core each load their own ("Multiple instances of Three.js").
- **exifr's file-path input breaks on Node 26.** Always pass it a Buffer.
- **GalleryPlugin focuses its active thumbnail when it opens**, which scrolled the page. `src/viewer/setup.ts` patches `HTMLElement.prototype.focus` to add `preventScroll` for elements inside `.psv-gallery`.
- **`MarkersPlugin.removeMarker` throws if the id doesn't exist.** Use the editor's `drop()` helper pattern.
- **VirtualTourPlugin replaces a photo's markers after `node-changed`.** Re-add temporary markers on the next tick.
- **Prev/next:** album order is navigated with fixed overlay buttons (`.tour-nav`) added in `setup.ts`, not in-scene arrows. Only `links` written in album.yml appear as arrows in the panorama. Any control placed inside the viewer needs PSV's `CONSTANTS.CAPTURE_EVENTS_CLASS` (`psv--capture-event`); otherwise the viewer's touchend `preventDefault()` cancels the click on touch screens.
- **The map is driven by `setup.ts`.** VirtualTourPlugin only talks to PlanPlugin in `positionMode: "gps"`; we use `"manual"`, so `setup.ts` sets the plan hotspots, recentres on `node-changed` and handles `select-hotspot`.
- **`tsc` needs `src/generated/albums.json`**, so `build` runs `content` first. The JSON's inferred type is looser than `Manifest`, hence the `unknown` cast in `src/manifest.ts`.
- **Album pages are written after `vite build`**, so the service worker's precache list can't include them. HTML is deliberately not precached; navigations use a network-first runtime cache. `navigateFallback` is off; an SPA fallback would serve the home page for album URLs.
- **Dev routing:** a Vite middleware serves `album.html` for `/albums/<slug>/`. `vite preview` serves the real generated pages.
- **Scripts import with `.ts` extensions** (`allowImportingTsExtensions`) so `tsx` and `tsc` both resolve them.
- The custom domain needs DNS-only (unproxied) records. GitHub can't issue its HTTPS certificate behind the Cloudflare proxy.
