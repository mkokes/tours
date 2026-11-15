import { esc } from "./format";
import { icons } from "./icons";

/** The address of an album, or of one photo in it (`?p=` opens that photo; see album.ts). */
export function shareUrl(origin: string, slug: string, photoId?: string): string {
  const url = new URL(`/albums/${slug}/`, origin);
  if (photoId) url.searchParams.set("p", photoId);
  return url.href;
}

/**
 * Copies text to the clipboard. Falls back to a hidden textarea + execCommand where the async
 * Clipboard API is missing or refused (older browsers, non-secure origins). Resolves false if
 * neither works.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Markup for a copy-link button; wired up by `initShareButtons()`. `label` is the button text
 * (hidden visually, but still the accessible name, with the `share-button-icon` variant).
 */
export function shareButton(
  url: string,
  label: string,
  variant: "" | "share-button-icon" = "",
): string {
  const l = esc(label);
  return `<button type="button" class="share-button ${variant}" data-share-url="${esc(url)}" data-label="${l}" title="${l}"><span class="share-icon">${icons.link}</span><span class="share-label">${l}</span></button>`;
}

const RESET_MS = 2000;

/**
 * Handles clicks on every `[data-share-url]` button, including ones rendered later (the photo
 * details panel re-renders on each photo). Call once per page.
 */
export function initShareButtons() {
  const live = document.createElement("div");
  live.className = "sr-only";
  live.setAttribute("role", "status");
  document.body.append(live);

  const timers = new WeakMap<HTMLElement, number>();

  document.addEventListener("click", async (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>("[data-share-url]");
    if (!btn) return;
    e.preventDefault();
    const ok = await copyText(btn.dataset.shareUrl!);
    const message = ok ? "Link copied" : "Couldn't copy the link";

    btn.querySelector(".share-icon")!.innerHTML = ok ? icons.check : icons.link;
    btn.querySelector(".share-label")!.textContent = message;
    btn.classList.toggle("is-copied", ok);
    live.textContent = message;

    clearTimeout(timers.get(btn));
    timers.set(
      btn,
      window.setTimeout(() => {
        btn.querySelector(".share-icon")!.innerHTML = icons.link;
        btn.querySelector(".share-label")!.textContent = btn.dataset.label!;
        btn.classList.remove("is-copied");
        live.textContent = "";
      }, RESET_MS),
    );
  });
}
