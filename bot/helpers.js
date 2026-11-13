// Small copies of the web app helpers (src/lib/format.js + time.js).
export const TIMEZONE = process.env.APP_TIMEZONE || "Asia/Karachi";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function money(n) {
  return "Rs " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function fmtDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function fillTemplate(tpl, values) {
  return tpl.replace(/\{(\w+)\}/g, (all, k) => (k in values ? values[k] : all));
}

export function diffDays(a, b) {
  return Math.round((Date.parse(a.slice(0, 10) + "T00:00:00Z") - Date.parse(b.slice(0, 10) + "T00:00:00Z")) / 86_400_000);
}

function parts(date, opts) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hourCycle: "h23", ...opts }).formatToParts(date);
  return Object.fromEntries(p.map((x) => [x.type, x.value]));
}

export function today() {
  const p = parts(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

export function hourNow() {
  return Number(parts(new Date(), { hour: "2-digit" }).hour);
}

export function normalizePhone(raw, countryCode = "92") {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = countryCode + d.slice(1);
  return d;
}
