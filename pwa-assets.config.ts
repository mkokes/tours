import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Generates favicon.ico, the PWA icons and the Apple touch icon from public/favicon.svg.
// Run `npm run generate-pwa-assets` after changing the SVG, then commit the files it writes.
// The icon is a charcoal tile, so pad the maskable and Apple icons with the same colour.
const background = "#242424";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ["public/favicon.svg"],
});
