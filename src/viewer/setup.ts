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

/** Arrow pitch for automatic next/previous links (slightly below the horizon). */
const AUTO_LINK_PITCH = -0.25;

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

/**
 * When no photo in the album defines links, chain the photos in album order: "next" straight
 * ahead and "previous" behind. Once any link is written in album.yml, only explicit links are used.
 */
function linksFor(album: Album, index: number, auto: boolean): VirtualTourLink[] {
  const photo = album.photos[index];
  if (!auto) {
    return photo.links.map((l) => ({ nodeId: l.to, position: { yaw: l.yaw, pitch: l.pitch } }));
  }
  const n = album.photos.length;
  if (n < 2) return [];
  const next = album.photos[(index + 1) % n];
  const prev = album.photos[(index - 1 + n) % n];
  const links: VirtualTourLink[] = [
    { nodeId: next.id, position: { yaw: 0, pitch: AUTO_LINK_PITCH } },
  ];
  if (prev.id !== next.id) {
    links.push({ nodeId: prev.id, position: { yaw: Math.PI, pitch: AUTO_LINK_PITCH } });
  }
  return links;
}

export function createTourViewer(
  container: HTMLElement,
  album: Album,
  startId: string,
  onChange: (photo: Photo) => void,
): TourViewer {
  const wide = matchMedia("(min-width: 768px)").matches;
  const showMap = !album.hideLocation && album.photos.some((p) => p.gps);
  const autoLinks = album.photos.every((p) => p.links.length === 0);
  const start = album.photos.find((p) => p.id === startId) ?? album.photos[0];

  const nodes: VirtualTourNode[] = album.photos.map((p, i) => ({
    id: p.id,
    panorama: p.media.pano,
    thumbnail: p.media.thumb,
    name: esc(p.title),
    caption: esc(p.title),
    links: linksFor(album, i, autoLinks),
    markers: p.markers.map((m) => toMarker(m)),
    gps: showMap ? p.gps : undefined,
    plan: showMap && p.gps ? { tooltip: esc(p.title) } : false,
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

  tour.addEventListener("node-changed", ({ node }) => {
    const photo = album.photos.find((p) => p.id === node.id);
    if (photo) onChange(photo);
  });

  return { viewer, tour, markers };
}
