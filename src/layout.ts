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

// Same items and order as navItems in martykokes.com's SiteLayout.tsx; keep them in step.
const navItems = [
  { href: `${MAIN_SITE}/`, label: "Home" },
  { href: `${MAIN_SITE}/about`, label: "About" },
  { href: `${MAIN_SITE}/experience`, label: "Experience" },
  { href: `${MAIN_SITE}/projects`, label: "Projects" },
  { href: "/", label: "Tours", tours: true },
  { href: `${MAIN_SITE}/contact`, label: "Contact" },
];

/**
 * Renders the shared header and footer, matching martykokes.com so the two read as one site.
 * Tours is the active section on every page; `page` is "home" on the album list itself.
 */
export function renderLayout(page: "home" | "album") {
  const navLinks = navItems
    .map((i) => {
      const current = i.tours && page === "home" ? ' aria-current="page"' : "";
      return `<a class="nav-link${i.tours ? " active" : ""}" href="${i.href}"${current}>${i.label}</a>`;
    })
    .join("");

  const header = document.querySelector<HTMLElement>(".site-header")!;
  header.innerHTML = `
    <div class="header-inner">
      <a class="site-logo" href="${MAIN_SITE}/">Marty Kokes</a>
      <nav class="nav-desktop" aria-label="Main">${navLinks}</nav>
      <div class="theme-toggle" role="radiogroup" aria-label="Theme">
        ${themeOptions
          .map(
            (o) =>
              `<button type="button" role="radio" class="theme-option" data-theme-value="${o.value}" title="${o.label} theme" aria-label="${o.label} theme">${o.icon}</button>`,
          )
          .join("")}
      </div>
      <button type="button" class="nav-mobile icon-button" aria-label="Open menu" aria-haspopup="dialog">${icons.menu}</button>
    </div>
    <dialog class="nav-drawer-dialog" aria-label="Menu">
      <div class="nav-drawer-header">
        <button type="button" class="icon-button nav-drawer-close" aria-label="Close">${icons.close}</button>
        <span class="nav-drawer-title">Menu</span>
      </div>
      <nav class="nav-drawer" aria-label="Main">${navLinks}</nav>
    </dialog>`;

  const drawer = header.querySelector<HTMLDialogElement>(".nav-drawer-dialog")!;
  header.querySelector(".nav-mobile")!.addEventListener("click", () => drawer.showModal());
  header.querySelector(".nav-drawer-close")!.addEventListener("click", () => drawer.close());
  // A click on the backdrop lands on the dialog element itself.
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) drawer.close();
  });
  // Close if the window grows past the mobile breakpoint while the drawer is open.
  matchMedia("(min-width: 768px)").addEventListener("change", (e) => {
    if (e.matches) drawer.close();
  });

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
