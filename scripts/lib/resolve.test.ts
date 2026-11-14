import { describe, expect, it } from "vitest";
import { parseAlbumConfig } from "../../src/content/schema.ts";
import { albumPageHtml } from "./pages.ts";
import { photoId, resolveAlbum, sortAlbums, titleCase, type SourcePhoto } from "./resolve.ts";

const src = (file: string, extra: Partial<SourcePhoto> = {}): SourcePhoto => ({
  file,
  width: 8000,
  height: 4000,
  media: { pano: `/p/${file}`, preview: `/v/${file}`, thumb: `/t/${file}` },
  ...extra,
});
const cfg = (raw: unknown = {}) => parseAlbumConfig(raw, "album.yml");

describe("parseAlbumConfig", () => {
  it("accepts an empty file and fills defaults", () => {
    expect(cfg(null)).toEqual({ unlisted: false, hideLocation: false, photos: {} });
  });

  it("names the file and field on errors", () => {
    expect(() => parseAlbumConfig({ unlisted: "yes" }, "albums/x/album.yml")).toThrow(
      /albums\/x\/album\.yml[\s\S]*unlisted/,
    );
    expect(() => cfg({ photos: { "a.jpg": { markers: [{ id: "m", yaw: 0 }] } } })).toThrow(
      /photos\.a\.jpg\.markers\.0\.pitch/,
    );
  });

  it("rejects unknown keys (typos)", () => {
    expect(() => cfg({ titel: "x" })).toThrow(/titel/);
  });

  it("normalises YAML dates", () => {
    expect(cfg({ date: new Date("2026-08-10T00:00:00Z") }).date).toBe("2026-08-10");
    expect(() => cfg({ date: "Aug 10" })).toThrow(/YYYY-MM-DD/);
  });
});

describe("helpers", () => {
  it("derives ids and titles from filenames", () => {
    expect(photoId("My Dock (2).JPG")).toBe("my-dock-2");
    expect(titleCase("lake-superior_trip")).toBe("Lake Superior Trip");
  });
});

describe("resolveAlbum", () => {
  it("applies defaults from the folder and EXIF", () => {
    const album = resolveAlbum("lake-trip", cfg(), [
      src("b.jpg", { date: "2026-08-11T09:00:00" }),
      src("a.jpg", { date: "2026-08-12T09:00:00" }),
      src("c.jpg"),
    ]);
    expect(album.title).toBe("Lake Trip");
    expect(album.date).toBe("2026-08-11");
    // Dated photos by date, undated last.
    expect(album.photos.map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(album.cover).toBe("b");
    expect(album.photos[0].title).toBe("B");
  });

  it("puts explicit order first and resolves cover/links to ids", () => {
    const album = resolveAlbum(
      "x",
      cfg({
        order: ["Two.jpg"],
        cover: "One.jpg",
        photos: { "Two.jpg": { links: [{ to: "One.jpg", yaw: 1, pitch: 0 }] } },
      }),
      [src("One.jpg"), src("Two.jpg")],
    );
    expect(album.photos.map((p) => p.id)).toEqual(["two", "one"]);
    expect(album.cover).toBe("one");
    expect(album.photos[0].links).toEqual([{ to: "one", yaw: 1, pitch: 0 }]);
  });

  it("errors on references to missing photos and self links", () => {
    expect(() => resolveAlbum("x", cfg({ cover: "nope.jpg" }), [src("a.jpg")])).toThrow(
      /cover refers to missing photo "nope.jpg"/,
    );
    expect(() =>
      resolveAlbum(
        "x",
        cfg({ photos: { "a.jpg": { links: [{ to: "a.jpg", yaw: 0, pitch: 0 }] } } }),
        [src("a.jpg")],
      ),
    ).toThrow(/points to itself/);
  });

  it("errors when two files map to the same id", () => {
    expect(() => resolveAlbum("x", cfg(), [src("a b.jpg"), src("a-b.jpg")])).toThrow(/both map/);
  });

  it("prefers album.yml GPS over EXIF, as [lon, lat]", () => {
    const album = resolveAlbum("x", cfg({ photos: { "a.jpg": { gps: { lat: 45, lon: 12 } } } }), [
      src("a.jpg", { gps: [1, 2] }),
      src("b.jpg", { gps: [3, 4] }),
    ]);
    expect(album.photos.map((p) => p.gps)).toEqual([
      [12, 45],
      [3, 4],
    ]);
  });

  it("drops all GPS when hideLocation is set", () => {
    const album = resolveAlbum(
      "x",
      cfg({ hideLocation: true, photos: { "a.jpg": { gps: { lat: 45, lon: 12 } } } }),
      [src("a.jpg"), src("b.jpg", { gps: [3, 4] })],
    );
    expect(album.photos.every((p) => p.gps === undefined)).toBe(true);
    expect(JSON.stringify(album)).not.toContain("gps");
  });
});

describe("sortAlbums", () => {
  it("orders newest first with undated albums last", () => {
    const mk = (slug: string, date?: string) => ({
      ...resolveAlbum(slug, cfg(), [src("a.jpg")]),
      date,
    });
    expect(
      sortAlbums([mk("old", "2020-01-01"), mk("none"), mk("new", "2026-01-01")]).map((a) => a.slug),
    ).toEqual(["new", "old", "none"]);
  });
});

describe("albumPageHtml", () => {
  const template =
    '<html><head><meta name="description" content="x" /><title>Album</title></head><body></body></html>';

  it("fills title, description and og tags, escaping text", () => {
    const album = resolveAlbum("x", cfg({ title: 'Tom & "Jerry"', description: "<b>hi</b>" }), [
      src("a.jpg"),
    ]);
    const html = albumPageHtml(template, album);
    expect(html).toContain("<title>Tom &amp; &quot;Jerry&quot; · Tours · Marty Kokes</title>");
    expect(html).toContain('content="&lt;b&gt;hi&lt;/b&gt;"');
    expect(html).toContain('og:image" content="https://tours.martykokes.com/v/a.jpg"');
    expect(html).not.toContain("noindex");
  });

  it("marks unlisted albums noindex", () => {
    const album = resolveAlbum("x", cfg({ unlisted: true }), [src("a.jpg")]);
    expect(albumPageHtml(template, album)).toContain('name="robots" content="noindex"');
  });
});
