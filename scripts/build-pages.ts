/**
 * Post-build step: turns dist/album.html into one static page per album with its own title and
 * link-preview tags, then writes 404.html and sitemap.xml.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Album, Manifest } from "../src/content/types.ts";
import { albumPageHtml, SITE_URL } from "./lib/pages.ts";

const dist = join(process.cwd(), "dist");
const manifest: Manifest = JSON.parse(
  await readFile(join(process.cwd(), "src", "generated", "albums.json"), "utf8"),
);

const template = await readFile(join(dist, "album.html"), "utf8");
for (const album of manifest.albums) {
  const dir = join(dist, "albums", album.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), albumPageHtml(template, album));
}
await rm(join(dist, "album.html"));

const home = await readFile(join(dist, "index.html"), "utf8");
await writeFile(
  join(dist, "404.html"),
  home
    .replace("<body>", '<body data-not-found="true">')
    .replace(/<title>[^<]*<\/title>/, "<title>Not found · Tours · Marty Kokes</title>")
    .replace("</head>", '  <meta name="robots" content="noindex" />\n  </head>'),
);

const listed = manifest.albums.filter((a: Album) => !a.unlisted);
const urls = [`${SITE_URL}/`, ...listed.map((a) => `${SITE_URL}/albums/${a.slug}/`)];
await writeFile(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
);

console.log(`Pages: ${manifest.albums.length} album pages, ${urls.length} sitemap URLs`);
