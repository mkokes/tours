/** Escapes text for use in innerHTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` (local, no zone) → "August 10, 2026" (+ time). */
export function formatDate(value: string, withTime = false): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  const [hh = 0, mm = 0] = value.length > 10 ? value.slice(11).split(":").map(Number) : [];
  const date = new Date(y, m - 1, d, hh, mm);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    ...(withTime && value.length > 10 ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
