import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";
import { AutorotatePlugin } from "@photo-sphere-viewer/autorotate-plugin";
import { GalleryPlugin } from "@photo-sphere-viewer/gallery-plugin";
import "@photo-sphere-viewer/gallery-plugin/index.css";
import { MarkersPlugin, type MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/markers-plugin/index.css";
import { PlanPlugin } from "@photo-sphere-viewer/plan-plugin";
import "@photo-sphere-viewer/plan-plugin/index.css";
import {
  VirtualTourPlugin,
  type VirtualTourLink,
  type VirtualTourNode,
} from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import "leaflet/dist/leaflet.css";
import type { Album, Photo, PhotoMarker } from "../content/types";
import { esc } from "../format";
import { icons } from "../icons";
import "./viewer.css";

export interface TourViewer {
  viewer: Viewer;
  tour: VirtualTourPlugin;
  markers: MarkersPlugin;
}

/*
 * GalleryPlugin focuses the active thumbnail whenever the gallery opens (including on load). The
 * browser then scrolls it into view, jumping the page past the album title. Keep the focus (it
 * helps keyboard users) but without scrolling, for gallery elements only.
 */
const nativeFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
  const inGallery = this.closest(".psv-gallery");
  nativeFocus.call(this, inGallery ? { ...options, preventScroll: true } : options);
};

export function toMarker(m: PhotoMarker, extraClass = ""): MarkerConfig {
  return {
    id: m.id,
    position: { yaw: m.yaw, pitch: m.pitch },
    html: `<span class="tour-pin ${extraClass}"></span>`,
    anchor: "center center",
    tooltip: m.tooltip ? { content: esc(m.tooltip), position: "top center" } : undefined,
    // Author-written HTML from album.yml, shown in the side panel.
    content: m.content,
  };
}

/** In-scene links are only the ones written in album.yml; album order uses the fixed prev/next buttons. */
function linksFor(photo: Photo): VirtualTourLink[] {
  return photo.links.map((l) => ({ nodeId: l.to, position: { yaw: l.yaw, pitch: l.pitch } }));
}

/**
 * Fixed previous/next buttons on the viewer's left and right edges, stepping through the album in
 * order (wrapping). Returns a function that updates their tooltips for the current photo.
 */
function addNavButtons(
  viewer: Viewer,
  tour: VirtualTourPlugin,
  album: Album,
): (photo: Photo) => void {
  const n = album.photos.length;
  const make = (dir: "prev" | "next") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tour-nav tour-nav-${dir}`;
    button.setAttribute("aria-label", dir === "prev" ? "Previous photo" : "Next photo");
    button.innerHTML = dir === "prev" ? icons.chevronLeft : icons.chevronRight;
    viewer.container.appendChild(button);
    return button;
  };
  const prev = make("prev");
  const next = make("next");
  let current = 0;
  const go = (step: number) => {
    tour.setCurrentNode(album.photos[(current + step + n) % n].id);
  };
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  // Don't let clicks on the buttons reach the panorama (drag/click handling).
  for (const b of [prev, next]) b.addEventListener("pointerdown", (e) => e.stopPropagation());

  return (photo) => {
    current = Math.max(0, album.photos.indexOf(photo));
    const p = album.photos[(current - 1 + n) % n];
    const q = album.photos[(current + 1) % n];
    prev.title = `Previous: ${p.title}`;
    next.title = `Next: ${q.title}`;
  };
}

export function createTourViewer(
  container: HTMLElement,
  album: Album,
  startId: string,
  onChange: (photo: Photo) => void,
): TourViewer {
  const wide = matchMedia("(min-width: 768px)").matches;
  const showMap = !album.hideLocation && album.photos.some((p) => p.gps);
  const start = album.photos.find((p) => p.id === startId) ?? album.photos[0];

  const nodes: VirtualTourNode[] = album.photos.map((p) => ({
    id: p.id,
    panorama: p.media.pano,
    thumbnail: p.media.thumb,
    name: esc(p.title),
    caption: esc(p.title),
    links: linksFor(p),
    markers: p.markers.map((m) => toMarker(m)),
  }));

  const viewer = new Viewer({
    container,
    // The tour plugin loads the start node; this avoids a double load.
    panorama: undefined,
    caption: esc(start.title),
    loadingTxt: "Loading panorama…",
    mousewheelCtrlKey: true,
    touchmoveTwoFingers: false,
    defaultZoomLvl: 30,
    navbar: ["autorotate", "zoom", "move", "gallery", "caption", "fullscreen"],
    plugins: [
      MarkersPlugin,
      GalleryPlugin.withConfig({
        visibleOnLoad: wide && album.photos.length > 1,
        hideOnClick: !wide,
        thumbnailSize: { width: 160, height: 80 },
      }),
      AutorotatePlugin.withConfig({
        autostartDelay: 20000,
        autostartOnIdle: true,
        autorotateSpeed: "1rpm",
        autorotatePitch: 0,
      }),
      ...(showMap
        ? [
            PlanPlugin.withConfig({
              coordinates: start.gps ?? album.photos.find((p) => p.gps)?.gps,
              defaultZoom: 14,
              visibleOnLoad: wide,
              position: "bottom left",
              size: { width: "260px", height: "180px" },
              spotStyle: { color: "#476700", hoverColor: "#baff39", size: 14 },
              pinSize: 30,
            }),
          ]
        : []),
      VirtualTourPlugin.withConfig({
        dataMode: "client",
        positionMode: "manual",
        renderMode: "3d",
        nodes,
        startNodeId: start.id,
        preload: true,
        transitionOptions: { showLoader: true, speed: "20rpm", effect: "fade", rotation: true },
      }),
    ],
  });

  const tour = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
  const markers = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);

  /*
   * VirtualTourPlugin only drives the PlanPlugin in "gps" position mode. We use "manual" (links
   * and markers are placed by yaw/pitch), so keep the map in step ourselves.
   */
  const plan = showMap ? viewer.getPlugin<PlanPlugin>(PlanPlugin) : null;
  if (plan) {
    plan.setHotspots(
      album.photos
        .filter((p) => p.gps)
        .map((p) => ({ id: p.id, coordinates: p.gps!, tooltip: esc(p.title) })),
    );
    plan.addEventListener("select-hotspot", ({ hotspotId }) => {
      if (album.photos.some((p) => p.id === hotspotId)) tour.setCurrentNode(hotspotId);
    });
  }

  const updateNav = album.photos.length > 1 ? addNavButtons(viewer, tour, album) : null;
  updateNav?.(start);

  tour.addEventListener("node-changed", ({ node }) => {
    const photo = album.photos.find((p) => p.id === node.id);
    if (!photo) return;
    updateNav?.(photo);
    if (plan) {
      if (photo.gps) plan.setCoordinates(photo.gps);
      plan.setActiveHotspot(photo.id);
    }
    onChange(photo);
  });

  return { viewer, tour, markers };
}
