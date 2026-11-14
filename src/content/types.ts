/** Shape of src/generated/albums.json, produced by scripts/build-content.ts. */

export interface PhotoMarker {
  id: string;
  yaw: number;
  pitch: number;
  tooltip?: string;
  /** HTML shown in the side panel when the marker is clicked. */
  content?: string;
}

export interface PhotoLink {
  /** Target photo id. */
  to: string;
  yaw: number;
  pitch: number;
}

export interface Photo {
  /** URL-safe id derived from the filename; used in `?p=`. */
  id: string;
  /** Source filename inside albums/<slug>/. */
  file: string;
  title: string;
  caption?: string;
  location?: string;
  /** Local date-time the photo was taken, `YYYY-MM-DDTHH:mm:ss` (no zone). */
  date?: string;
  camera?: string;
  /** [longitude, latitude], the order photo-sphere-viewer expects. Absent when hidden. */
  gps?: [number, number];
  width: number;
  height: number;
  media: { pano: string; preview: string; thumb: string };
  markers: PhotoMarker[];
  links: PhotoLink[];
}

export interface Album {
  slug: string;
  title: string;
  /** `YYYY-MM-DD`. */
  date?: string;
  description?: string;
  location?: string;
  /** Photo id of the cover. */
  cover: string;
  unlisted: boolean;
  hideLocation: boolean;
  photos: Photo[];
}

export interface Manifest {
  albums: Album[];
}
