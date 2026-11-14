import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "../styleguide/tokens.css";
import "./styles/site.css";
import { icons } from "./icons";
import { getThemePref, setThemePref, type ThemePref } from "./theme";

const MAIN_SITE = "https://martykokes.com";

const themeOptions: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: icons.sun },
  { value: "system", label: "System", icon: icons.monitor },
  { value: "dark", label: "Dark", icon: icons.moon },
];

const socialLinks = [
  { label: "LinkedIn", url: "https://www.linkedin.com/in/martykokes/", icon: icons.linkedin },
  { label: "GitHub", url: "https://github.com/mkokes", icon: icons.github },
];

/** Renders the shared header and footer, matching martykokes.com. */
export function renderLayout(active: "albums" | null) {
  const header = document.querySelector<HTMLElement>(".site-header")!;
  header.innerHTML = `
    <div class="header-inner">
      <a class="site-logo" href="/">Marty Kokes <span class="site-logo-sub">Tours</span></a>
      <nav class="nav-desktop" aria-label="Main">
        <a class="nav-link${active === "albums" ? " active" : ""}" href="/"${active === "albums" ? ' aria-current="page"' : ""}>Albums</a>
        <a class="nav-link" href="${MAIN_SITE}">martykokes.com <span class="nav-ext">${icons.external}</span></a>
      </nav>
      <div class="theme-toggle" role="radiogroup" aria-label="Theme">
        ${themeOptions
          .map(
            (o) =>
              `<button type="button" role="radio" class="theme-option" data-theme-value="${o.value}" title="${o.label} theme" aria-label="${o.label} theme">${o.icon}</button>`,
          )
          .join("")}
      </div>
    </div>`;

  const buttons = header.querySelectorAll<HTMLButtonElement>(".theme-option");
  const sync = () => {
    const pref = getThemePref();
    buttons.forEach((b) => {
      const on = b.dataset.themeValue === pref;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-checked", String(on));
    });
  };
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      setThemePref(b.dataset.themeValue as ThemePref);
      sync();
    }),
  );
  sync();

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const footer = document.querySelector<HTMLElement>(".site-footer")!;
  footer.innerHTML = `
    <div class="social-links">
      ${socialLinks
        .map(
          (l) =>
            `<a class="icon-button" href="${l.url}" target="_blank" rel="noreferrer" aria-label="${l.label}" title="${l.label}">${l.icon}</a>`,
        )
        .join("")}
    </div>
    <p class="muted">© ${new Date().getFullYear()} <a href="${MAIN_SITE}">Marty Kokes</a></p>`;
}
