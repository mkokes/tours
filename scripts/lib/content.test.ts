import { beforeEach, describe, expect, it, vi } from "vitest";

const exif = vi.hoisted(() => ({ parse: vi.fn(), gps: vi.fn() }));
vi.mock("exifr", () => ({ default: exif }));

const { readExif } = await import("./content.ts");

describe("readExif GPS", () => {
  beforeEach(() => {
    exif.parse.mockResolvedValue({});
  });

  it("returns a real position as [lon, lat]", async () => {
    exif.gps.mockResolvedValue({ latitude: 28.2096, longitude: 83.9856 });
    expect((await readExif(Buffer.alloc(0))).gps).toEqual([83.9856, 28.2096]);
  });

  it("treats 0,0 as no position", async () => {
    exif.gps.mockResolvedValue({ latitude: 0, longitude: 0 });
    expect((await readExif(Buffer.alloc(0))).gps).toBeUndefined();
  });
});
