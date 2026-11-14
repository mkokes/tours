import type { AlbumConfig } from "../../src/content/schema.ts";
import type { Album, Photo } from "../../src/content/types.ts";

/** Facts about one source photo gathered from the file itself. */
export interface SourcePhoto {
  file: string;
  width: number;
  height: number;
  /** `YYYY-MM-DDTHH:mm:ss`, local time from EXIF. */
  date?: string;
  camera?: string;
  /** [lon, lat] from EXIF. */
  gps?: [number, number];
  media: Photo["media"];
}

/** Sorts after any real date string. */
const UNDATED = String.fromCharCode(0xffff);

export function photoId(file: string): string {
  return file
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Combines album.yml with the photos found on disk. Pure, so it can be unit tested.
 * Throws when album.yml references photos that don't exist.
 */
export function resolveAlbum(slug: string, config: AlbumConfig, sources: SourcePhoto[]): Album {
  const where = `albums/${slug}/album.yml`;
  const byFile = new Map(sources.map((s) => [s.file, s]));
  const need = (file: string, field: string) => {
    if (!byFile.has(file)) throw new Error(`${where}: ${field} refers to missing photo "${file}"`);
  };

  const ids = new Map<string, string>();
  for (const s of sources) {
    const id = photoId(s.file);
    if (!id) throw new Error(`albums/${slug}/${s.file}: filename has no usable characters`);
    const clash = ids.get(id);
    if (clash) throw new Error(`albums/${slug}: "${clash}" and "${s.file}" both map to id "${id}"`);
    ids.set(id, s.file);
  }

  for (const file of config.order ?? []) need(file, "order");
  if (config.cover) need(config.cover, "cover");
  for (const [file, p] of Object.entries(config.photos)) {
    need(file, "photos");
    for (const l of p.links) {
      need(l.to, `photos.${file}.links`);
      if (l.to === file) throw new Error(`${where}: photos.${file}.links points to itself`);
    }
  }

  // Explicit order first, then the rest by date taken, then filename.
  const listed = config.order ?? [];
  const rest = sources
    .filter((s) => !listed.includes(s.file))
    .sort(
      (a, b) =>
        (a.date ?? UNDATED).localeCompare(b.date ?? UNDATED) || a.file.localeCompare(b.file),
    );
  const ordered = [...listed.map((f) => byFile.get(f)!), ...rest];

  const photos: Photo[] = ordered.map((s) => {
    const c = config.photos[s.file];
    const gps: [number, number] | undefined = c?.gps ? [c.gps.lon, c.gps.lat] : s.gps;
    return {
      id: photoId(s.file),
      file: s.file,
      title: c?.title ?? titleCase(photoId(s.file)),
      caption: c?.caption,
      location: c?.location,
      date: s.date,
      camera: s.camera,
      gps: config.hideLocation ? undefined : gps,
      width: s.width,
      height: s.height,
      media: s.media,
      markers: c?.markers ?? [],
      links: (c?.links ?? []).map((l) => ({ to: photoId(l.to), yaw: l.yaw, pitch: l.pitch })),
    };
  });

  const dates = photos.map((p) => p.date).filter((d): d is string => !!d);
  return {
    slug,
    title: config.title ?? titleCase(slug),
    date: config.date ?? (dates.length ? dates.sort()[0].slice(0, 10) : undefined),
    description: config.description,
    location: config.location ?? photos.find((p) => p.location)?.location,
    cover: config.cover ? photoId(config.cover) : (photos[0]?.id ?? ""),
    unlisted: config.unlisted,
    hideLocation: config.hideLocation,
    photos,
  };
}

/** Newest first; undated albums last, then by title. */
export function sortAlbums(albums: Album[]): Album[] {
  return [...albums].sort(
    (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title),
  );
}
