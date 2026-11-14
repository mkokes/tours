import { z } from "zod";

/** Validation for albums/<slug>/album.yml. Every field is optional. */

const angle = z.number().finite();

const markerSchema = z.strictObject({
  id: z.string().min(1),
  yaw: angle,
  pitch: angle,
  tooltip: z.string().optional(),
  content: z.string().optional(),
});

const linkSchema = z.strictObject({
  /** Target photo filename. */
  to: z.string().min(1),
  yaw: angle,
  pitch: angle,
});

const dateSchema = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"));

const photoSchema = z.strictObject({
  title: z.string().optional(),
  caption: z.string().optional(),
  location: z.string().optional(),
  /** Overrides (or supplies) the EXIF GPS position. */
  gps: z
    .strictObject({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
    .optional(),
  markers: z.array(markerSchema).default([]),
  links: z.array(linkSchema).default([]),
});

export const albumConfigSchema = z.strictObject({
  title: z.string().optional(),
  date: dateSchema.optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  cover: z.string().optional(),
  unlisted: z.boolean().default(false),
  hideLocation: z.boolean().default(false),
  order: z.array(z.string()).optional(),
  /** Keyed by photo filename. */
  photos: z.record(z.string(), photoSchema).default({}),
});

export type AlbumConfig = z.infer<typeof albumConfigSchema>;
export type PhotoConfig = z.infer<typeof photoSchema>;

/** Parses raw YAML data, throwing an error that names the file and each bad field. */
export function parseAlbumConfig(raw: unknown, file: string): AlbumConfig {
  const result = albumConfigSchema.safeParse(raw ?? {});
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  ${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid ${file}:\n${lines.join("\n")}`);
  }
  return result.data;
}
