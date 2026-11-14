/**
 * Dev-only hotspot editor. Loaded from album.ts behind `import.meta.env.DEV`, so it never ships
 * in the production bundle. Click the panorama to place a marker or a link to another photo, then
 * copy the generated YAML into albums/<slug>/album.yml.
 */
import { stringify } from "yaml";
import type { Album, Photo, PhotoLink, PhotoMarker } from "../content/types";
import { esc } from "../format";
import { toMarker, type TourViewer } from "./setup";
import "./editor.css";

interface Pending {
  markers: PhotoMarker[];
  links: PhotoLink[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function attachEditor(
  { viewer, tour, markers }: TourViewer,
  album: Album,
  tools: HTMLElement,
) {
  const pending = new Map<string, Pending>();
  let active = false;
  let placed: { yaw: number; pitch: number } | null = null;

  const current = (): Photo =>
    album.photos.find((p) => p.id === tour.getCurrentNode()?.id) ?? album.photos[0];
  const has = (id: string) => markers.getMarkers().some((m) => m.id === id);
  const drop = (id: string) => {
    if (has(id)) markers.removeMarker(id);
  };
  const pendingFor = (id: string) => {
    if (!pending.has(id)) pending.set(id, { markers: [], links: [] });
    return pending.get(id)!;
  };

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "button button-small";
  toggleBtn.innerHTML = "Edit hotspots <kbd>E</kbd>";
  tools.append(toggleBtn);

  const panel = document.createElement("aside");
  panel.className = "tour-editor";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Hotspot editor");
  document.body.append(panel);

  const container = viewer.container;
  const readout = { yaw: 0, pitch: 0 };

  function render() {
    const photo = current();
    const p = pendingFor(photo.id);
    const others = album.photos.filter((o) => o.id !== photo.id);
    const nextId = `marker-${photo.markers.length + p.markers.length + 1}`;

    panel.innerHTML = `
      <header>
        <strong>Hotspot editor</strong>
        <span class="dev-tag">dev only</span>
        <button type="button" class="editor-close" aria-label="Close editor">×</button>
      </header>
      <p class="readout">Cursor <code>yaw ${readout.yaw.toFixed(3)}</code> <code>pitch ${readout.pitch.toFixed(3)}</code></p>
      <p class="muted">Editing <strong>${esc(photo.file)}</strong>. Click the panorama to place a hotspot.</p>
      ${
        placed
          ? `<form class="editor-form">
              <p>At <code>yaw ${placed.yaw}</code> <code>pitch ${placed.pitch}</code></p>
              <fieldset class="kind">
                <label><input type="radio" name="kind" value="marker" checked /> Marker</label>
                <label><input type="radio" name="kind" value="link" ${others.length ? "" : "disabled"} /> Link to photo</label>
              </fieldset>
              <div class="kind-marker">
                <label>Id <input name="id" value="${nextId}" required /></label>
                <label>Tooltip <input name="tooltip" placeholder="Shown on hover" /></label>
                <label>Panel content (HTML) <textarea name="content" rows="2" placeholder="Optional; opens a side panel on click"></textarea></label>
              </div>
              <div class="kind-link" hidden>
                <label>Target <select name="to">${others
                  .map((o) => `<option value="${o.id}">${esc(o.title)} (${esc(o.file)})</option>`)
                  .join("")}</select></label>
              </div>
              <div class="row">
                <button type="submit" class="button button-small button-primary">Add</button>
                <button type="button" class="button button-small editor-cancel">Cancel</button>
              </div>
            </form>`
          : ""
      }
      <label class="snippet-label">YAML for this photo
        <textarea class="snippet" readonly rows="10">${esc(snippet(photo, p))}</textarea>
      </label>
      <p class="muted small">Paste under <code>photos:</code> in <code>albums/${album.slug}/album.yml</code>, replacing this photo's entry. Keep its title/caption lines. The page reloads with the saved hotspots.</p>
      <div class="row">
        <button type="button" class="button button-small button-primary editor-copy">Copy YAML</button>
        <button type="button" class="button button-small editor-clear" ${p.markers.length + p.links.length ? "" : "disabled"}>Discard new</button>
      </div>`;

    panel.querySelector(".editor-close")!.addEventListener("click", () => setActive(false));
    panel.querySelector(".editor-copy")!.addEventListener("click", async (e) => {
      const text = panel.querySelector<HTMLTextAreaElement>(".snippet")!.value;
      await navigator.clipboard.writeText(text);
      (e.target as HTMLButtonElement).textContent = "Copied";
    });
    panel.querySelector(".editor-clear")!.addEventListener("click", () => {
      for (const m of p.markers) drop(m.id);
      for (let i = 0; i < p.links.length; i++) drop(`__link-${i}`);
      pending.delete(photo.id);
      render();
    });

    const form = panel.querySelector<HTMLFormElement>(".editor-form");
    if (form) {
      form.addEventListener("change", () => {
        const kind = new FormData(form).get("kind");
        form.querySelector<HTMLElement>(".kind-marker")!.hidden = kind !== "marker";
        form.querySelector<HTMLElement>(".kind-link")!.hidden = kind !== "link";
        form.querySelector<HTMLInputElement>('[name="id"]')!.required = kind === "marker";
      });
      form.querySelector(".editor-cancel")!.addEventListener("click", () => {
        placed = null;
        drop("__placing");
        render();
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = new FormData(form);
        drop("__placing");
        if (f.get("kind") === "link") {
          p.links.push({ to: String(f.get("to")), ...placed! });
        } else {
          const id = String(f.get("id")).trim();
          if (has(id)) {
            alert(`A marker with id "${id}" already exists on this photo.`);
            return;
          }
          const tooltip = String(f.get("tooltip") ?? "").trim();
          const content = String(f.get("content") ?? "").trim();
          p.markers.push({
            id,
            ...placed!,
            ...(tooltip && { tooltip }),
            ...(content && { content }),
          });
        }
        placed = null;
        showPending();
        render();
      });
    }
  }

  /** YAML for one photo: its existing markers/links plus the new ones. */
  function snippet(photo: Photo, p: Pending): string {
    const fileOf = (id: string) => album.photos.find((o) => o.id === id)?.file ?? id;
    const entry: Record<string, unknown> = {};
    const allMarkers = [...photo.markers, ...p.markers];
    const allLinks = [...photo.links, ...p.links];
    if (allMarkers.length) entry.markers = allMarkers;
    if (allLinks.length) {
      entry.links = allLinks.map((l) => ({ to: fileOf(l.to), yaw: l.yaw, pitch: l.pitch }));
    }
    return stringify({ [photo.file]: entry }, { flowCollectionPadding: true });
  }

  /** Shows this session's unsaved hotspots on the current photo. */
  function showPending() {
    const p = pending.get(current().id);
    if (!p) return;
    for (const m of p.markers) {
      if (!has(m.id)) markers.addMarker(toMarker(m, "is-new"));
    }
    p.links.forEach((l, i) => {
      const id = `__link-${i}`;
      if (has(id)) return;
      markers.addMarker({
        ...toMarker({ id, yaw: l.yaw, pitch: l.pitch }, "is-new is-link"),
        tooltip: {
          content: `New link → ${esc(album.photos.find((o) => o.id === l.to)?.title ?? l.to)}`,
        },
      });
    });
  }

  function setActive(on: boolean) {
    active = on;
    panel.hidden = !on;
    container.classList.toggle("is-editing", on);
    toggleBtn.classList.toggle("is-selected", on);
    if (!on) {
      placed = null;
      drop("__placing");
    }
    render();
  }

  toggleBtn.addEventListener("click", () => setActive(!active));
  document.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (e.key.toLowerCase() !== "e" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (t.closest("input, textarea, select, [contenteditable]")) return;
    setActive(!active);
  });

  container.addEventListener("mousemove", (e) => {
    if (!active) return;
    const rect = container.getBoundingClientRect();
    const pos = viewer.dataHelper.viewerCoordsToSphericalCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    readout.yaw = pos.yaw;
    readout.pitch = pos.pitch;
    const el = panel.querySelector(".readout");
    if (el) {
      el.innerHTML = `Cursor <code>yaw ${pos.yaw.toFixed(3)}</code> <code>pitch ${pos.pitch.toFixed(3)}</code>`;
    }
  });

  viewer.addEventListener("click", ({ data }) => {
    if (!active || data.rightclick || data.marker) return;
    placed = { yaw: round(data.yaw), pitch: round(data.pitch) };
    drop("__placing");
    markers.addMarker(toMarker({ id: "__placing", ...placed }, "is-placing"));
    render();
    panel.querySelector<HTMLInputElement>('[name="tooltip"]')?.focus();
  });

  tour.addEventListener("node-changed", () => {
    placed = null;
    // The tour replaces the node's markers after this event; re-add ours on the next tick.
    setTimeout(showPending, 0);
    if (active) render();
  });
}
