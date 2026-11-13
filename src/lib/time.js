// Gym-local time helpers. Servers (e.g. Vercel) run in UTC, so we always
// convert to the gym's time zone explicitly instead of trusting the server clock.
export const TIMEZONE = process.env.APP_TIMEZONE || "Asia/Karachi";

function parts(date, opts) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hourCycle: "h23", ...opts }).formatToParts(date);
  return Object.fromEntries(p.map((x) => [x.type, x.value]));
}

/** YYYY-MM-DD in the gym's time zone. */
export function zonedDate(date = new Date()) {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Current hour (0-23) in the gym's time zone. */
export function zonedHour(date = new Date()) {
  return Number(parts(date, { hour: "2-digit" }).hour);
}

/** "6:42 PM" in the gym's time zone. */
export function zonedTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit" });
}

/** ISO timestamp for a wall-clock time (date + hour:minute) in the gym's time zone. */
export function zonedIso(date, hour, minute) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const p = parts(new Date(guess), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const shown = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return new Date(guess - (shown - guess)).toISOString();
}
