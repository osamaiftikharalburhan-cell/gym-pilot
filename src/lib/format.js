// Pure helpers, safe for both server and client.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function money(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "Rs " + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function shortMoney(n) {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 100000) return sign + "Rs " + (a / 100000).toFixed(1).replace(/\.0$/, "") + "L";
  if (a >= 1000) return sign + "Rs " + Math.round(a / 1000) + "k";
  return money(n);
}

export function fmtDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function shortDate(iso) {
  return fmtDate(iso).replace(/ \d{4}$/, "");
}

export function monthLabel(ym) {
  return MONTHS[Number(ym.split("-")[1]) - 1];
}

export function monthLong(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function displayPhone(p) {
  if (p.startsWith("92") && p.length === 12) return `+92 ${p.slice(2, 5)} ${p.slice(5)}`;
  return "+" + p;
}

export function normalizePhone(raw, countryCode = "92") {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = countryCode + d.slice(1);
  return d;
}

export function whatsappLink(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function fillTemplate(tpl, values) {
  return tpl.replace(/\{(\w+)\}/g, (all, k) => (k in values ? values[k] : all));
}

// ---- date math on YYYY-MM-DD strings ----
export function toDate(iso) {
  return new Date(iso.slice(0, 10) + "T00:00:00Z");
}
export function toIso(d) {
  return d.toISOString().slice(0, 10);
}
export function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}
export function addMonths(iso, n) {
  const d = toDate(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toIso(d);
}
export function diffDays(a, b) {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86_400_000);
}
export function shiftMonth(ym, n) {
  return addMonths(ym + "-01", n).slice(0, 7);
}

export function relativeDays(days) {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const m = Math.round(days / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
