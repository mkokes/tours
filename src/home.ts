import type { Album } from "./content/types";
import { manifest } from "./manifest";
import { esc, formatDate, plural } from "./format";
import { icons } from "./icons";
import { renderLayout } from "./layout";
import { initShareButtons, shareButton, shareUrl } from "./share";

renderLayout("albums");

const app = document.getElementById("app")!;
initShareButtons();
const albums = manifest.albums.filter((a) => !a.unlisted);
const notFound = document.body.dataset.notFound === "true";

app.innerHTML = `
  <div class="page-fade">
    ${
      notFound
        ? `<div class="notice" role="alert"><strong>Page not found.</strong> That album may have moved; here's everything that's published.</div>`
        : ""
    }
    <section class="intro">
      <p class="eyebrow">360° photo albums</p>
      <h1>Tours</h1>
      <p class="lead">Places I've been, captured all the way around. Open an album and drag to look in any direction.</p>
    </section>
    ${
      albums.length
        ? `<ul class="album-grid">${albums.map(albumCard).join("")}</ul>`
        : `<p class="muted">No albums yet.</p>`
    }
  </div>`;

function albumCard(a: Album): string {
  const cover = a.photos.find((p) => p.id === a.cover) ?? a.photos[0];
  const meta = [
    a.date && `<span>${icons.calendar} ${esc(formatDate(a.date))}</span>`,
    `<span>${icons.images} ${plural(a.photos.length, "photo")}</span>`,
  ]
    .filter(Boolean)
    .join("");
  // The share button sits beside the card link, not inside it (no buttons inside links).
  return `
    <li class="album-item">
      ${shareButton(shareUrl(location.origin, a.slug), `Copy link to ${a.title}`, "share-button-icon")}
      <a class="album-card lift" href="/albums/${a.slug}/">
        <span class="album-cover">
          <img src="${cover.media.preview}" alt="" width="1024" height="512" loading="lazy" decoding="async" />
          <span class="album-badge">360°</span>
        </span>
        <span class="album-body">
          <span class="album-title">${esc(a.title)}</span>
          <span class="album-meta">${meta}</span>
          ${a.location ? `<span class="pill">${icons.pin} ${esc(a.location)}</span>` : ""}
        </span>
      </a>
    </li>`;
}
