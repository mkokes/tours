import { buildContent } from "./lib/content.ts";

try {
  await buildContent();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
