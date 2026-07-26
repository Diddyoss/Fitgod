/** Local calendar date as YYYY-MM-DD. Deliberately not UTC — the outfit should
 * roll over at the user's midnight, not London's. */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from `aISO` to `bISO`. Positive when b is later. */
export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`).getTime();
  const b = new Date(`${bISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatLongDate(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
