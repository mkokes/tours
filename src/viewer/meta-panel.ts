import type { Album, Photo } from "../content/types";
import { esc, formatDate } from "../format";
import { icons } from "../icons";

/** Fills the details panel under the viewer. Each line is omitted when its value is missing. */
export function renderPhotoDetails(el: HTMLElement, album: Album, photo: Photo) {
  const index = album.photos.indexOf(photo) + 1;
  const facts = [
    photo.date && [icons.calendar, "Taken", formatDate(photo.date, true)],
    photo.location && [icons.pin, "Location", photo.location],
    photo.camera && [icons.camera, "Camera", photo.camera],
  ].filter((f): f is string[] => !!f);

  el.innerHTML = `
    <p class="eyebrow">Photo ${index} of ${album.photos.length}</p>
    <h2>${esc(photo.title)}</h2>
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
