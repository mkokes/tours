import type { Album } from "../../src/content/types.ts";

export const SITE_URL = "https://tours.martykokes.com";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fills the built album.html template with one album's title, description and og tags. */
export function albumPageHtml(template: string, album: Album): string {
  const title = `${album.title} · Tours · Marty Kokes`;
  const count = `${album.photos.length} photo${album.photos.length === 1 ? "" : "s"}`;
  const description = album.description ?? `A 360° photo album by Marty Kokes, ${count}.`;
  const cover = album.photos.find((p) => p.id === album.cover) ?? album.photos[0];
  const url = `${SITE_URL}/albums/${album.slug}/`;

  const meta = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Marty Kokes · Tours" />`,
    `<meta property="og:title" content="${escapeHtml(album.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    cover && `<meta property="og:image" content="${SITE_URL}${cover.media.preview}" />`,
    cover && `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${url}" />`,
    album.unlisted && `<meta name="robots" content="noindex" />`,
  ].filter(Boolean);

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace("</head>", `  ${meta.join("\n    ")}\n  </head>`);
}
