import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import exifr from "exifr";
import sharp from "sharp";
import { parse as parseYaml } from "yaml";
import { parseAlbumConfig } from "../../src/content/schema.ts";
import type { Album, Manifest } from "../../src/content/types.ts";
import { photoId, resolveAlbum, sortAlbums, type SourcePhoto } from "./resolve.ts";

/** Bump when the image pipeline changes so cached outputs are regenerated. */
const PIPELINE_VERSION = 1;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const LARGE_FILE = 50 * 1024 * 1024;

const SIZES = {
  pano: 6144,
  preview: 1024,
  thumb: 480,
} as const;

interface CacheEntry {
  hash: string;
  width: number;
  height: number;
  date?: string;
  camera?: string;
  gps?: [number, number];
}
type Cache = Record<string, CacheEntry>;

export interface BuildOptions {
  root?: string;
  log?: (msg: string) => void;
}

/**
 * Scans albums/, produces web-sized images in public/media/ (with all metadata stripped) and
 * writes src/generated/albums.json. Unchanged photos are skipped using a content-hash cache.
 */
export async function buildContent({
  root = process.cwd(),
  log = console.log,
}: BuildOptions = {}): Promise<Manifest> {
  const albumsDir = join(root, "albums");
  const mediaDir = join(root, "public", "media");
  const cacheFile = join(root, ".cache", "content.json");
  const outFile = join(root, "src", "generated", "albums.json");

  const cache: Cache = existsSync(cacheFile) ? JSON.parse(await readFile(cacheFile, "utf8")) : {};
  const nextCache: Cache = {};
  const albums: Album[] = [];
  let processed = 0;

  const slugs = existsSync(albumsDir)
    ? (await readdir(albumsDir, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && !/^[._]/.test(d.name))
        .map((d) => d.name)
        .sort()
    : [];

  for (const slug of slugs) {
    if (!SLUG.test(slug)) {
      throw new Error(`albums/${slug}: folder names must be lowercase letters, digits and dashes`);
    }
    const dir = join(albumsDir, slug);
    const ymlPath = join(dir, "album.yml");
    const ymlName = `albums/${slug}/album.yml`;
    let raw: unknown = {};
    if (existsSync(ymlPath)) {
      try {
        raw = parseYaml(await readFile(ymlPath, "utf8"));
      } catch (err) {
        throw new Error(`Invalid ${ymlName}: ${err instanceof Error ? err.message : err}`);
      }
    }
    const config = parseAlbumConfig(raw, ymlName);

    const files = (await readdir(dir)).filter((f) => IMAGE_EXT.test(f)).sort();
    if (!files.length) {
      log(`! albums/${slug}: no photos, skipping`);
      continue;
    }

    const sources: SourcePhoto[] = [];
    for (const file of files) {
      const src = join(dir, file);
      const key = `${slug}/${file}`;
      const id = photoId(file);
      const outDir = join(mediaDir, slug, id);
      const buf = await readFile(src);
      const hash = createHash("sha1").update(buf).update(`v${PIPELINE_VERSION}`).digest("hex");

      let entry = cache[key];
      const outputsExist = ["pano.jpg", "preview.jpg", "thumb.webp"].every((f) =>
        existsSync(join(outDir, f)),
      );
      if (!entry || entry.hash !== hash || !outputsExist) {
        entry = { hash, ...(await processPhoto(buf, outDir)) };
        processed++;
        log(`  processed ${key}`);
      }
      nextCache[key] = entry;

      const { size } = await stat(src);
      if (size > LARGE_FILE) {
        log(`! ${key} is ${(size / 1048576).toFixed(0)} MB; GitHub rejects files over 100 MB`);
      }
      if (Math.abs(entry.width / entry.height - 2) > 0.02) {
        log(`! ${key} is ${entry.width}x${entry.height}, not 2:1 equirectangular`);
      }

      const v = hash.slice(0, 8);
      const base = `/media/${slug}/${id}`;
      sources.push({
        file,
        width: entry.width,
        height: entry.height,
        date: entry.date,
        camera: entry.camera,
        gps: entry.gps,
        media: {
          pano: `${base}/pano.jpg?v=${v}`,
          preview: `${base}/preview.jpg?v=${v}`,
          thumb: `${base}/thumb.webp?v=${v}`,
        },
      });
    }

    albums.push(resolveAlbum(slug, config, sources));
  }

  await pruneMedia(mediaDir, albums);

  const manifest: Manifest = { albums: sortAlbums(albums) };
  await mkdir(join(root, "src", "generated"), { recursive: true });
  await writeFile(outFile, JSON.stringify(manifest, null, 2) + "\n");
  await mkdir(join(root, ".cache"), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(nextCache, null, 2) + "\n");

  const photoCount = albums.reduce((n, a) => n + a.photos.length, 0);
  log(`Content: ${albums.length} albums, ${photoCount} photos (${processed} processed)`);
  return manifest;
}

async function processPhoto(buf: Buffer, outDir: string): Promise<Omit<CacheEntry, "hash">> {
  // limitInputPixels: false allows very large stitched panoramas.
  const input = () => sharp(buf, { limitInputPixels: false });
  const meta = await input().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  await mkdir(outDir, { recursive: true });
  // sharp drops all EXIF/XMP/GPS metadata unless asked to keep it, so outputs are clean.
  await Promise.all([
    input()
      .resize({ width: SIZES.pano, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toFile(join(outDir, "pano.jpg")),
    input()
      .resize({ width: SIZES.preview })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(join(outDir, "preview.jpg")),
    input().resize({ width: SIZES.thumb }).webp({ quality: 70 }).toFile(join(outDir, "thumb.webp")),
  ]);

  return { width, height, ...(await readExif(buf)) };
}

/** Reads date taken, camera and GPS. Missing or unreadable EXIF yields nothing. */
export async function readExif(
  buf: Buffer,
): Promise<{ date?: string; camera?: string; gps?: [number, number] }> {
  const out: { date?: string; camera?: string; gps?: [number, number] } = {};
  try {
    const tags = await exifr.parse(buf, {
      pick: ["DateTimeOriginal", "CreateDate", "Make", "Model"],
      reviveValues: false,
    });
    // Raw EXIF dates look like "2026:08:10 14:22:01" and carry no zone; keep them as local time.
    const raw: unknown = tags?.DateTimeOriginal ?? tags?.CreateDate;
    const m =
      typeof raw === "string" && raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (m) out.date = `${m[1]}-${m[2]}-${m[3]}T${m[4]}`;

    const make = String(tags?.Make ?? "").trim();
    const model = String(tags?.Model ?? "").trim();
    const camera =
      make && model && !model.toLowerCase().startsWith(make.toLowerCase().split(" ")[0])
        ? `${make} ${model}`
        : model || make;
    if (camera) out.camera = camera;
  } catch {
    // No EXIF block.
  }
  try {
    const gps = await exifr.gps(buf);
    // Cameras without a GPS fix (e.g. an Insta360 not paired with a phone) write 0,0; treat it as none.
    const unset = gps?.latitude === 0 && gps?.longitude === 0;
    if (gps && !unset && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      out.gps = [round(gps.longitude), round(gps.latitude)];
    }
  } catch {
    // No GPS block.
  }
  return out;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Removes media folders for photos or albums that no longer exist. */
async function pruneMedia(mediaDir: string, albums: Album[]) {
  if (!existsSync(mediaDir)) return;
  const keep = new Map(albums.map((a) => [a.slug, new Set(a.photos.map((p) => p.id))]));
  for (const slug of await readdir(mediaDir)) {
    const ids = keep.get(slug);
    if (!ids) {
      await rm(join(mediaDir, slug), { recursive: true, force: true });
      continue;
    }
    for (const id of await readdir(join(mediaDir, slug))) {
      if (!ids.has(id)) await rm(join(mediaDir, slug, id), { recursive: true, force: true });
    }
  }
}
