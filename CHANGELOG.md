# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Installable PWA: manifest, maskable and Apple icons generated from the favicon, and offline caching. Albums you've opened before work offline, except the map tiles.
- The mk-styleguide is vendored in `styleguide/` (`tokens.css` and `STYLEGUIDE.md`), as in martykokes.com.
- AGENTS.md, CLAUDE.md and this changelog.

### Changed

- Fixed previous/next buttons on the viewer edges replace the in-panorama arrows, which didn't point towards the next photo.
- Nepal: removed near-duplicate shots, keeping one per spot.

### Removed

- The demo album (Poly Haven panoramas).
- The style tokens load from `styleguide/tokens.css`; the copy in `src/styles/` was removed.
- The README covers styling, the PWA and the current deploy setup.

### Fixed

- The street map now follows the current photo and highlights its spot; clicking a spot on the map opens that photo.

## [1.0.0] - 2026-11-14

### Added

- 360° photo album site at tours.martykokes.com, built on Photo Sphere Viewer with Vite and TypeScript.
- Albums come from `albums/<slug>/` folders with an optional `album.yml` (title, date, description, location, cover, order, per-photo captions, markers and links).
- Build pipeline that resizes photos with sharp, strips all EXIF/GPS metadata, and only re-processes photos that changed.
- Viewer with arrows between photos, a thumbnail gallery, clickable markers, an OpenStreetMap mini-map and idle auto-rotate.
- One static page per album (`/albums/<slug>/`) with link-preview tags, plus a sitemap and a 404 page. `?p=<photo>` links to a single photo.
- Unlisted albums and a per-album `hideLocation` option.
- Dev-only hotspot editor: click the panorama to place a marker or link, then copy the YAML.
- Home page album grid, header, footer and Light / System / Dark theme toggle matching martykokes.com.
- GitHub Pages deploy workflow that caches processed images between runs.
- Demo album with CC0 panoramas from Poly Haven.

[Unreleased]: https://github.com/mkokes/tours/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mkokes/tours/releases/tag/v1.0.0
