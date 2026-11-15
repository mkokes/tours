# Tours

360° photo albums by Marty Kokes, live at [tours.martykokes.com](https://tours.martykokes.com).

Each album is a set of panoramas you can drag around in. Arrows and a thumbnail strip move between photos, clickable markers point things out, and a small map shows where each photo was taken. It's built with [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/), Vite and TypeScript. It follows the shared [mk-styleguide](https://github.com/mkokes/mk-styleguide) design system (neon lime, greys, Poppins and Inter), like [martykokes.com](https://martykokes.com), works in light and dark mode, and installs as an app. It's deployed to GitHub Pages.

## Quick start

```sh
npm ci
npm run dev        # processes albums/, then serves http://localhost:5173
npm test
npm run build      # full production build → dist/
npx vite preview   # serve dist/ locally, including the service worker
```

Requires Node 22 or newer. CI uses Node 22.

## Adding an album

1. Create a folder `albums/<slug>/`. The slug becomes the URL, `/albums/<slug>/`, and may contain only lowercase letters, digits and dashes.
2. Add full 360° equirectangular photos: 2:1 `.jpg`, `.png` or `.webp` files, straight from a 360 camera. Commit the originals, keeping each under 50 MB (GitHub rejects files over 100 MB).
3. Optionally add an `album.yml` (see below). With no `album.yml`:
   - the title comes from the folder name;
   - photos are ordered by the EXIF date taken, then by filename;
   - the cover is the first photo;
   - the map uses each photo's EXIF GPS position, if it has one.
4. Push to `main`. The site rebuilds and deploys in a couple of minutes.

The build makes web-sized copies of each photo in `public/media/` (gitignored): a 6144 px panorama for the viewer, a 1024 px preview for album cards and link previews, and a 480 px thumbnail. **All EXIF and GPS metadata is stripped from the published images.** Only new or changed photos are processed, both locally and in CI.

While `npm run dev` is running, any change under `albums/` rebuilds automatically.

## album.yml

Every field is optional. Photos are keyed by filename. A mistake (a misspelled key, a reference to a missing photo, a bad value) fails the build with the file and field named.

```yaml
title: Lake Superior Trip
date: 2026-08-10 # defaults to the earliest EXIF date
description: Three days on the North Shore.
location: Grand Marais, MN # defaults to the first photo's location
cover: shore.jpg # defaults to the first photo
unlisted: false # true = left off the home page and sitemap, noindex; the link still works
hideLocation: false # true = no map, and no GPS data published for this album
order: [shore.jpg, dock.jpg] # listed first; the rest follow by date
photos:
  dock.jpg:
    title: The Dock # defaults to the filename
    caption: Morning fog.
    location: Grand Marais, MN
    gps: { lat: 47.75, lon: -90.33 } # overrides or supplies EXIF GPS (EXIF 0,0 counts as none)
    taken: "2026-08-10 07:45" # overrides the EXIF time, e.g. if the camera clock was wrong
    markers:
      - id: boat
        yaw: 1.2 # radians; use the hotspot editor to find these
        pitch: -0.1
        tooltip: Our boat
        content: "<p>Opens in a side panel when clicked.</p>"
    links:
      - to: shore.jpg # arrow to another photo in this album
        yaw: 3.1
        pitch: -0.05
```

### Moving between photos

If **no** photo in the album has `links`, every photo gets a "next" arrow straight ahead and a "previous" arrow behind, following album order. Once you add `links` to any photo, only the links you write are used, so a hand-built tour has no stray arrows. The thumbnail strip always lets you jump to any photo.

### Sharing a photo

Album URLs take `?p=<photo>` to open a specific photo, for example `/albums/nepal/?p=img-20251021-175814-00-086`. The photo id is the filename without its extension, lowercased, with other characters turned into dashes. The address bar updates as you move around, so you can copy it to share the current view.

## Hotspot editor (dev only)

On an album page in `npm run dev`, press **E** (or click **Edit hotspots**):

1. Click the panorama where you want a hotspot.
2. Choose **Marker** (tooltip and optional HTML panel) or **Link to photo**.
3. Click **Copy YAML** and paste it under `photos:` in that album's `album.yml`, replacing that photo's `markers` and `links`. The snippet already includes the existing ones.

The editor isn't included in production builds.

## Styling

Styling follows the mk-styleguide guide, vendored in [styleguide/](styleguide/STYLEGUIDE.md). Its tokens (`styleguide/tokens.css`) are loaded in `src/layout.ts`. The site styles in `src/styles/site.css` use only its role variables (`--color-bg`, `--color-text`, `--color-link`, `--color-primary`, …), so light and dark mode follow automatically. Lime (`--color-primary`) is a fill only; text-coloured accents use `--color-link`.

Don't edit the vendored files. Change the system in mk-styleguide, then copy the new `tokens.css` and `STYLEGUIDE.md` over the ones in `styleguide/`.

## PWA

The site installs as an app (`vite-plugin-pwa`, the same setup as the other projects). Updates install silently and take effect on the next load.

- **Precached:** the app shell (scripts, styles, fonts, icons).
- **Pages:** network-first, so they're always fresh online. The last copy is used offline.
- **Panoramas:** cached the first time they're viewed. Their URLs carry a content hash, so a cached copy never goes stale.

Albums you've opened before work offline, except the map tiles.

The icons are generated from `public/favicon.svg`. After changing it, run `npm run generate-pwa-assets` and commit the files it writes to `public/`.

## Deployment

Pushing to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml). It lints, checks formatting, runs the tests, builds and deploys to GitHub Pages. Pull requests run the same checks without deploying. Processed images are cached between runs, so only new photos are re-encoded.

Hosting setup (already done):

- **GitHub Pages:** the source is "GitHub Actions", and the custom domain is `tours.martykokes.com` (also in `public/CNAME`).
- **DNS:** `tours` is a CNAME to `mkokes.github.io`. In Cloudflare it must be **DNS only** (not proxied), or GitHub can't issue the HTTPS certificate.

## Project layout

| Path                          | Purpose                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `albums/`                     | Source photos and `album.yml` files                                                        |
| `scripts/lib/content.ts`      | Scans albums, reads EXIF, resizes images, writes the manifest                              |
| `scripts/lib/resolve.ts`      | Rules for defaults, ordering and GPS hiding (unit tested)                                  |
| `scripts/build-pages.ts`      | After the build, writes each album's page with link-preview tags, plus the 404 and sitemap |
| `src/content/schema.ts`       | `album.yml` validation                                                                     |
| `src/home.ts`, `src/album.ts` | Page entry points                                                                          |
| `src/viewer/`                 | Viewer setup, details panel, dev-only editor                                               |
| `src/styles/site.css`         | Site styles built on the styleguide tokens                                                 |
| `styleguide/`                 | Vendored mk-styleguide (`tokens.css`, `STYLEGUIDE.md`); don't edit it here                 |
| `pwa-assets.config.ts`        | Icon generation for the PWA                                                                |

More detail for contributors and coding agents: [AGENTS.md](AGENTS.md). Release notes: [CHANGELOG.md](CHANGELOG.md).

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
