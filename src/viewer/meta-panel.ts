import type { Album, Photo } from "../content/types";
import { esc, formatDate } from "../format";
import { icons } from "../icons";
import { shareButton, shareUrl } from "../share";

/** Fills the details panel under the viewer. Each line is omitted when its value is missing. */
export function renderPhotoDetails(el: HTMLElement, album: Album, photo: Photo) {
  // The viewer reports the starting photo again once it loads; keep the panel (and any
  // "Link copied" state on its share button) when the photo hasn't changed.
  if (el.dataset.photoId === photo.id) return;
  el.dataset.photoId = photo.id;
  const index = album.photos.indexOf(photo) + 1;
  const facts = [
    photo.date && [icons.calendar, "Taken", formatDate(photo.date, true)],
    photo.location && [icons.pin, "Location", photo.location],
    photo.camera && [icons.camera, "Camera", photo.camera],
  ].filter((f): f is string[] => !!f);

  el.innerHTML = `
    <p class="eyebrow">Photo ${index} of ${album.photos.length}</p>
    <div class="photo-title-row">
      <h2>${esc(photo.title)}</h2>
      ${shareButton(shareUrl(location.origin, album.slug, photo.id), "Copy photo link")}
    </div>
    ${photo.caption ? `<p class="caption">${esc(photo.caption)}</p>` : ""}
    ${
      facts.length
        ? `<dl class="facts">${facts
            .map(
              ([icon, label, value]) =>
                `<div class="fact"><dt><span class="fact-icon">${icon}</span>${label}</dt><dd>${esc(value)}</dd></div>`,
            )
            .join("")}</dl>`
        : ""
    }`;
}
