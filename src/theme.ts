/** Light / System / Dark preference, stored like martykokes.com (localStorage "theme"). */
export type ThemePref = "light" | "system" | "dark";

const media = matchMedia("(prefers-color-scheme: dark)");

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    // Storage blocked.
  }
  return "system";
}

function apply(pref: ThemePref) {
  const resolved = pref === "system" ? (media.matches ? "dark" : "light") : pref;
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = resolved === "dark" ? "#242424" : "#FFFFFF";
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", pref);
  } catch {
    // Storage blocked; still apply for this page view.
  }
  apply(pref);
}

media.addEventListener("change", () => {
  if (getThemePref() === "system") apply("system");
});
