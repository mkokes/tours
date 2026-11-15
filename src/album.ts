import type { Photo } from "./content/types";
import { manifest } from "./manifest";
import { esc, formatDate, plural } from "./format";
import { icons } from "./icons";
import { renderLayout } from "./layout";
import { initShareButtons, shareButton, shareUrl } from "./share";
import { renderPhotoDetails } from "./viewer/meta-panel";
import { createTourViewer } from "./viewer/setup";

renderLayout(null);

const app = document.getElementById("app")!;
initShareButtons();
const slug = location.pathname.match(/^\/albums\/([a-z0-9-]+)\/?$/)?.[1];
const album = manifest.albums.find((a) => a.slug === slug);

if (!album || !album.photos.length) {
  document.title = "Album not found · Tours · Marty Kokes";
  app.innerHTML = `
    <div class="page page-fade">
      <h1>Album not found</h1>
      <p class="lead">There's no album at this address.</p>
      <p><a class="button" href="/">${icons.arrowLeft} All albums</a></p>
    </div>`;
} else {
  document.title = `${album.title} · Tours · Marty Kokes`;
  const params = new URLSearchParams(location.search);
  const startId = params.get("p") ?? album.cover;

  const meta = [
    album.date && `<span>${icons.calendar} ${esc(formatDate(album.date))}</span>`,
    `<span>${icons.images} ${plural(album.photos.length, "photo")}</span>`,
    album.location && `<span>${icons.pin} ${esc(album.location)}</span>`,
  ]
    .filter(Boolean)
    .join("");

  app.innerHTML = `
    <div class="page album-head page-fade">
      <a class="back-link" href="/">${icons.arrowLeft} All albums</a>
      <h1>${esc(album.title)}</h1>
      <p class="album-meta">${meta}</p>
      ${album.description ? `<p class="lead">${esc(album.description)}</p>` : ""}
      <p class="album-share">${shareButton(shareUrl(location.origin, album.slug), "Copy album link")}</p>
      <div class="album-tools"></div>
    </div>
    <div class="viewer-wrap"><div id="viewer" class="viewer"></div></div>
    <div class="page">
      <section class="photo-details" aria-live="polite"></section>
      <p class="viewer-hint muted">Drag to look around. Use the arrows at the sides (or the map) to move between photos; Ctrl + scroll (or pinch) to zoom.</p>
    </div>`;

  const details = app.querySelector<HTMLElement>(".photo-details")!;
  const show = (photo: Photo) => {
    renderPhotoDetails(details, album, photo);
    const url = new URL(location.href);
    url.searchParams.set("p", photo.id);
    history.replaceState(null, "", url);
  };
  const first = album.photos.find((p) => p.id === startId) ?? album.photos[0];
  renderPhotoDetails(details, album, first);

  const tour = createTourViewer(document.getElementById("viewer")!, album, first.id, show);

  if (import.meta.env.DEV) {
    const { attachEditor } = await import("./viewer/editor");
    attachEditor(tour, album, app.querySelector<HTMLElement>(".album-tools")!);
  }
}
