// Server-only database access. The whole gym is one JSON document ("db"),
// stored in Upstash Redis online or data/db.json locally (see store.js).
import { cache } from "react";
import { io } from "next/cache";
import { createDemoDb, DB_VERSION } from "./seed";
import { readKey, writeKey } from "./store";
import { zonedDate, zonedHour, zonedTime } from "./time";
import { diffDays, displayPhone, fillTemplate, fmtDate, money, relativeDays, shortDate } from "./format";

/** Today's date in the gym's time zone (YYYY-MM-DD). */
export function todayIso() {
  return zonedDate();
}

export function fmtTime(iso) {
  return zonedTime(iso);
}

async function readRaw() {
  const db = await readKey("db");
  if (db && db.version === DB_VERSION) return db;
  const fresh = createDemoDb(todayIso(), zonedHour());
  await writeKey("db", fresh);
  return fresh;
}

/** Read the database (fresh on every request, shared within one request). */
export const getDb = cache(async () => {
  await io();
  return readRaw();
});

/** Read-modify-write helper for server actions. Returns whatever fn returns. */
export async function updateDb(fn) {
  const db = await readRaw();
  const result = fn(db);
  await writeKey("db", db);
  return result;
}

export async function resetDb() {
  await writeKey("db", createDemoDb(todayIso(), zonedHour()));
}

/** Status written by the WhatsApp bot (bot/index.js). */
export async function getBotStatus() {
  await io();
  return (await readKey("bot")) ?? { state: "offline" };
}

// ---------------- text builders ----------------
const firstName = (name) => name.split(" ")[0];

export function buildReminderText(settings, member, plan) {
  return fillTemplate(settings.reminderTemplate, {
    name: firstName(member.name),
    gym: settings.gymName,
    plan: plan.name,
    amount: money(plan.price),
    dueDate: fmtDate(member.dueDate),
  });
}

export function buildComebackText(settings, member, days) {
  return fillTemplate(settings.comebackTemplate, {
    name: firstName(member.name),
    gym: settings.gymName,
    days: String(days),
  });
}

export function buildWelcomeText(settings, admission, plan) {
  return [
    `Hi ${firstName(admission.name)}! 👋 Thanks for your interest in joining ${settings.gymName}.`,
    plan ? `Plan: ${plan.name} — ${money(plan.price)}${settings.admissionFee ? ` + ${money(settings.admissionFee)} one-time admission fee` : ""}.` : null,
    `Please visit us${settings.address ? ` at ${settings.address}` : ""} to complete your admission. See you soon 💪`,
  ].filter(Boolean).join("\n");
}

export function buildReceiptText(db, payment) {
  const m = db.members.find((x) => x.id === payment.memberId);
  const plan = db.plans.find((p) => p.id === m?.planId);
  return [
    `🧾 *${db.settings.gymName} — Payment Receipt*`,
    `Receipt #: ${payment.receiptNo}`,
    `Member: ${m?.name ?? "—"}`,
    `Plan: ${plan?.name ?? "—"}`,
    payment.note ? `For: ${payment.note}` : null,
    `Amount paid: ${money(payment.amount)}`,
    `Method: ${payment.method}`,
    `Date: ${fmtDate(payment.date)}`,
    m ? `Next due date: ${fmtDate(m.dueDate)}` : null,
    "",
    "Thank you for training with us! 💪",
  ].filter((l) => l !== null).join("\n");
}

// ---------------- computed views ----------------
/** Members with fee status, attendance stats and ready-made labels. */
export function memberViews(db, today = todayIso()) {
  const plans = new Map(db.plans.map((p) => [p.id, p]));
  const latest = (rows, key, val) => {
    const map = new Map();
    for (const r of rows) {
      const prev = map.get(r[key]);
      if (!prev || r[val] > prev) map.set(r[key], r[val]);
    }
    return map;
  };
  const lastPaid = latest(db.payments, "memberId", "date");
  const lastRem = latest(db.reminders.filter((r) => r.kind !== "comeback"), "memberId", "date");
  const lastVisit = latest(db.attendance, "memberId", "date");
  const month = today.slice(0, 7);
  const visitsThisMonth = new Map();
  for (const a of db.attendance) {
    if (a.date.startsWith(month)) visitsThisMonth.set(a.memberId, (visitsThisMonth.get(a.memberId) ?? 0) + 1);
  }

  return db.members.map((m) => {
    const plan = plans.get(m.planId) ?? { name: "—", price: 0, months: 1 };
    const daysLeft = diffDays(m.dueDate, today);
    let status;
    let dueLabel;
    if (m.status === "inactive") {
      status = "inactive";
      dueLabel = m.leftAt ? `Left on ${shortDate(m.leftAt)}` : "Not a member anymore";
    } else if (m.status === "frozen") {
      status = "frozen";
      dueLabel = `Frozen since ${shortDate(m.frozenAt ?? today)}`;
    } else if (daysLeft < 0) {
      status = "unpaid";
      dueLabel = `${-daysLeft} day${daysLeft === -1 ? "" : "s"} overdue`;
    } else if (daysLeft <= db.settings.dueSoonDays) {
      status = "due";
      dueLabel = daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    } else {
      status = "paid";
      dueLabel = `Next due ${shortDate(m.dueDate)}`;
    }

    const lp = lastPaid.get(m.id);
    const lr = lastRem.get(m.id);
    const lv = lastVisit.get(m.id) ?? null;
    const remDays = lr ? diffDays(today, lr) : null;
    const daysSinceVisit = lv ? diffDays(today, lv) : diffDays(today, m.joinDate);

    return {
      ...m,
      planName: plan.name,
      planPrice: plan.price,
      planMonths: plan.months,
      phoneLabel: displayPhone(m.phone),
      daysLeft,
      status,
      dueLabel,
      lastPaidLabel: lp ? fmtDate(lp) : null,
      lastReminderLabel: remDays === null ? null : relativeDays(remDays),
      remindedToday: remDays === 0,
      reminderText: buildReminderText(db.settings, m, plan),
      lastVisit: lv,
      lastVisitLabel: lv ? relativeDays(diffDays(today, lv)) : "Never",
      daysSinceVisit,
      checkedInToday: lv === today,
      visitsThisMonth: visitsThisMonth.get(m.id) ?? 0,
      comebackText: buildComebackText(db.settings, m, daysSinceVisit),
    };
  });
}

/** Income / expense totals for a YYYY-MM month. */
export function monthTotals(db, ym) {
  const income = db.payments.filter((p) => p.date.startsWith(ym)).reduce((s, p) => s + p.amount, 0);
  const expenses = db.expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + e.amount, 0);
  return { income, expenses, profit: income - expenses };
}

export const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Utilities", "Maintenance", "Equipment", "Marketing", "Other"];
export const PAYMENT_METHODS = ["Cash", "JazzCash", "EasyPaisa", "Bank"];
