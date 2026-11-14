# tours.martykokes.com

360° photo albums, built with [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/), Vite and
TypeScript. Styled with the same mk-styleguide tokens as martykokes.com. Deployed to GitHub Pages.

## Quick start

```sh
npm install
npm run dev        # processes albums/, then serves http://localhost:5173
npm run build      # content + type-check + Vite build + per-album pages → dist/
npm test
```

Requires Node 22+.

## Adding an album

1. Create a folder `albums/<slug>/`. The slug becomes the URL, `/albums/<slug>/`, and may contain
   only lowercase letters, digits and dashes.
2. Drop in full 360° equirectangular photos (2:1 `.jpg`, `.png` or `.webp`). Commit the originals.
   Keep each file under 50 MB; GitHub rejects files over 100 MB.
3. Optionally add an `album.yml` (see below). With no `album.yml`:
   - the title comes from the folder name;
   - photos are ordered by the EXIF date they were taken, then by filename;
   - the cover is the first photo;
   - the map uses each photo's EXIF GPS position.

The build writes resized copies to `public/media/`, which is gitignored. It makes a 6144 px
panorama, a 1024 px preview (used for album cards and link previews) and a 480 px thumbnail.
**All EXIF/GPS metadata is stripped from published images.** Only photos that changed get
re-processed.

While `npm run dev` is running, changes under `albums/` rebuild automatically.

## album.yml

Every field is optional. Photos are keyed by filename. A mistake (a typo'd key, a missing photo,
a bad value) fails the build with the file and field named.

```yaml
title: Lake Superior Trip
date: 2026-08-10 # defaults to the earliest EXIF date
description: Three days on the North Shore.
location: Grand Marais, MN # defaults to the first photo's location
cover: shore.jpg # defaults to the first photo
unlisted: false # true = hidden from the home page and sitemap, noindex; the link still works
hideLocation: false # true = no map, and no GPS data published for this album
order: [shore.jpg, dock.jpg] # listed first; the rest follow by date
photos:
  dock.jpg:
    title: The Dock # defaults to the filename
    caption: Morning fog.
    location: Grand Marais, MN
    gps: { lat: 47.75, lon: -90.33 } # overrides or supplies EXIF GPS
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

### Navigation between photos

If **no** photo in the album has `links`, every photo automatically gets a "next" arrow straight
ahead and a "previous" arrow behind, following album order. Once you add `links` to any photo,
only the links you write are used, so a hand-built tour has no stray arrows. The gallery strip
always lets you jump to any photo.

## Hotspot editor (dev only)

On an album page in `npm run dev`, press **E** (or click **Edit hotspots**):

1. Click the panorama where you want a hotspot.
2. Choose **Marker** (tooltip and optional HTML panel) or **Link to photo**.
3. Click **Copy YAML** and paste it under `photos:` in that album's `album.yml`, replacing that
   photo's `markers`/`links`. The snippet already includes the existing ones.

The editor is excluded from production builds.

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`, which lints, tests, builds and deploys to
GitHub Pages. `public/CNAME` sets the custom domain `tours.martykokes.com`.

One-time setup:

```sh
gh api -X POST repos/mkokes/tours/pages -f build_type=workflow
gh api -X PUT repos/mkokes/tours/pages -f cname=tours.martykokes.com -F https_enforced=true
```

DNS: `tours` must be a CNAME record pointing to `mkokes.github.io`.

## Project layout

| Path                          | Purpose                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `albums/`                     | Source photos and `album.yml` files                                                                |
| `scripts/lib/content.ts`      | Scans albums, reads EXIF, resizes images, writes the manifest                                      |
| `scripts/lib/resolve.ts`      | Pure rules for defaults, ordering and GPS hiding (unit tested)                                     |
| `scripts/build-pages.ts`      | After the build, writes `albums/<slug>/index.html` with og tags, plus `404.html` and `sitemap.xml` |
| `src/content/schema.ts`       | `album.yml` validation                                                                             |
| `src/home.ts`, `src/album.ts` | Page entry points                                                                                  |
| `src/viewer/`                 | Viewer setup, details panel, dev-only editor                                                       |
| `src/styles/tokens.css`       | Copied unchanged from mk-styleguide; don't edit it here                                            |

The demo album uses CC0 panoramas from [Poly Haven](https://polyhaven.com).
