// GymPilot WhatsApp AI bot.
// Runs on a computer that stays on (NOT on Vercel). Reads the same data as the website,
// answers questions with AI, and sends fee reminders automatically.
import "dotenv/config";
import os from "node:os";
import path from "node:path";
import QRCode from "qrcode";
import wweb from "whatsapp-web.js";
import { GoogleGenAI } from "@google/genai";
import { readKey, storageKind, updateDb, writeKey } from "./store.js";
import { diffDays, fillTemplate, fmtDate, hourNow, money, normalizePhone, today } from "./helpers.js";

const { Client, LocalAuth } = wweb;
const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

console.log(`GymPilot bot · storage: ${storageKind} · AI: ${ai ? MODEL : "off (fixed replies)"}`);

// ---------------- status shown in the website's Settings page ----------------
const status = { state: "starting", qr: null, me: null };
let lastReminderRun = (await readKey("bot").catch(() => null))?.lastReminderRun ?? null;

async function pushStatus(patch = {}) {
  Object.assign(status, patch);
  await writeKey("bot", { ...status, lastSeen: new Date().toISOString(), lastReminderRun }).catch((e) =>
    console.error("[status] could not save:", e.message),
  );
}
await pushStatus();
setInterval(() => pushStatus(), 60_000);

// ---------------- WhatsApp client ----------------
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(os.homedir(), ".gympilot-bot-session") }),
  puppeteer: {
    headless: true,
    timeout: 120_000,
    executablePath: process.env.CHROME_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", async (qr) => {
  console.log("\nScan this QR with the gym's WhatsApp (or open Settings in the website):");
  console.log(await QRCode.toString(qr, { type: "terminal", small: true }));
  await pushStatus({ state: "qr", qr: await QRCode.toDataURL(qr) });
});
client.on("authenticated", () => pushStatus({ state: "starting", qr: null }));
client.on("auth_failure", (m) => { console.error("[wa] auth failure:", m); pushStatus({ state: "starting", qr: null }); });
client.on("ready", () => {
  const me = client.info?.wid?.user ?? null;
  console.log("[wa] connected as", me);
  pushStatus({ state: "connected", qr: null, me });
});
client.on("disconnected", (reason) => {
  console.log("[wa] disconnected:", reason);
  pushStatus({ state: "starting", qr: null });
  setTimeout(() => client.initialize().catch(() => {}), 5000);
});

// ---------------- conversation state ----------------
const history = new Map(); // chatId -> [{ role: "user"|"model", text }]
const pausedUntil = new Map(); // chatId -> timestamp (owner replied manually)
const botSending = new Set(); // "chatId|text" of messages the bot itself is sending
const pending = new Map(); // chatId -> debounce timer
const PAUSE_MIN = 30;

function remember(chatId, role, text) {
  const h = history.get(chatId) ?? [];
  h.push({ role, text });
  history.set(chatId, h.slice(-12));
}

function skipChat(id) {
  return !id || id.endsWith("@g.us") || id.endsWith("@broadcast") || id.endsWith("@newsletter");
}

async function send(chatId, text) {
  const key = chatId + "|" + text;
  botSending.add(key);
  setTimeout(() => botSending.delete(key), 60_000);
  await client.sendMessage(chatId, text);
}

// Owner typed a reply from the phone -> stay quiet in that chat for a while.
client.on("message_create", (msg) => {
  if (!msg.fromMe || skipChat(msg.to) || msg.type !== "chat") return;
  const key = msg.to + "|" + msg.body;
  if (botSending.has(key)) { botSending.delete(key); return; }
  pausedUntil.set(msg.to, Date.now() + PAUSE_MIN * 60_000);
  remember(msg.to, "model", msg.body);
});

client.on("message", async (msg) => {
  if (msg.fromMe || skipChat(msg.from) || msg.type !== "chat") return;
  let phone = null;
  try { phone = (await msg.getContact()).number || null; } catch { /* ignore */ }
  remember(msg.from, "user", msg.body);
  if ((pausedUntil.get(msg.from) ?? 0) > Date.now()) return;

  // Wait a moment in case they send several messages in a row.
  clearTimeout(pending.get(msg.from));
  pending.set(msg.from, setTimeout(() => {
    pending.delete(msg.from);
    reply(msg, phone).catch((e) => console.error("[reply]", e.message));
  }, 2500));
});

// ---------------- AI replies ----------------
function memberSummary(db, m) {
  const plan = db.plans.find((p) => p.id === m.planId);
  const t = today();
  const days = diffDays(m.dueDate, t);
  const fee =
    m.status === "frozen" ? "Membership is frozen." :
    m.status === "inactive" ? "Not an active member anymore." :
    days < 0 ? `Fee is OVERDUE by ${-days} days (was due ${fmtDate(m.dueDate)}).` :
    `Fee is paid. Next due date: ${fmtDate(m.dueDate)}.`;
  const visits = db.attendance.filter((a) => a.memberId === m.id).map((a) => a.date).sort();
  const last = visits.at(-1);
  return `Name: ${m.name}. Plan: ${plan?.name ?? "-"} (${plan ? money(plan.price) : "-"}). ${fee} Last visit: ${last ? fmtDate(last) : "none"}.`;
}

function systemPrompt(db, member) {
  const s = db.settings;
  const plans = db.plans.map((p) => `- ${p.name}: ${money(p.price)} per ${p.months === 1 ? "month" : `${p.months} months`}`).join("\n");
  return `You are the friendly WhatsApp assistant of "${s.gymName}", a gym${s.address ? ` at ${s.address}` : ""}.

Rules:
- Use ONLY the information below. Never invent prices, timings, offers or facts.
- If you don't know, say the gym team will reply soon.
- Reply in English by default. If the customer writes in Urdu or Roman Urdu, reply in the same language and style.
- Keep replies short: 1–5 lines, WhatsApp style, at most one emoji.
- For new people who want to join, share the admission link: ${APP_URL}/join
- Never share information about other members.

Plans:
${plans}
${s.admissionFee ? `One-time admission fee: ${money(s.admissionFee)}` : "No admission fee."}

Gym information:
${s.gymInfo || "(none)"}
Gym phone: +${s.phone}
${member ? `\nThis customer is a member:\n${memberSummary(db, member)}` : "\nThis customer is not a registered member (probably a new inquiry)."}`;
}

function fallbackReply(db, text) {
  const s = db.settings;
  const t = text.toLowerCase();
  const plans = db.plans.map((p) => `• ${p.name}: ${money(p.price)}`).join("\n");
  if (/fee|price|charge|plan|package|kitni|rate|paise/.test(t)) {
    return `Our plans:\n${plans}${s.admissionFee ? `\nAdmission fee: ${money(s.admissionFee)} (one time)` : ""}\nJoin here: ${APP_URL}/join`;
  }
  if (/join|admission|register|dakhla|membership/.test(t)) {
    return `Great! You can send your admission request here: ${APP_URL}/join 💪`;
  }
  if (/time|timing|open|close|waqt|ladies/.test(t) && s.gymInfo) {
    return s.gymInfo.split("\n").slice(0, 3).join("\n");
  }
  return `Thanks for messaging ${s.gymName}! Our team will reply soon.\n\nPlans:\n${plans}\nJoin: ${APP_URL}/join`;
}

async function reply(msg, phone) {
  const chatId = msg.from;
  const db = await readKey("db");
  if (!db?.settings?.botEnabled) return;
  if ((pausedUntil.get(chatId) ?? 0) > Date.now()) return;

  const member = phone ? db.members.find((m) => m.phone === normalizePhone(phone, db.settings.countryCode)) : null;
  const h = history.get(chatId) ?? [];
  let text;
  if (ai) {
    try {
      const contents = [];
      for (const m of h) {
        const last = contents.at(-1);
        if (last?.role === m.role) last.parts[0].text += "\n" + m.text;
        else contents.push({ role: m.role, parts: [{ text: m.text }] });
      }
      while (contents.length && contents[0].role !== "user") contents.shift();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: { systemInstruction: systemPrompt(db, member), temperature: 0.4 },
      });
      text = (res.text || "").trim();
    } catch (e) {
      console.error("[ai]", e.message);
    }
  }
  text ||= fallbackReply(db, h.at(-1)?.text ?? "");

  const chat = await msg.getChat().catch(() => null);
  await chat?.sendStateTyping().catch(() => {});
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));
  if ((pausedUntil.get(chatId) ?? 0) > Date.now()) return;
  await send(chatId, text);
  remember(chatId, "model", text);
}

// ---------------- automatic fee reminders ----------------
async function runReminders() {
  if (status.state !== "connected") return;
  const db = await readKey("db");
  const s = db?.settings;
  if (!s?.autoReminders) return;
  const t = today();
  if (hourNow() < (s.reminderHour ?? 11) || lastReminderRun === t) return;
  lastReminderRun = t;
  await pushStatus();

  const recent = new Set(
    db.reminders.filter((r) => r.kind !== "comeback" && diffDays(t, r.date) < 3).map((r) => r.memberId),
  );
  const targets = db.members.filter((m) => m.status === "active" && m.dueDate < t && !recent.has(m.id));
  console.log(`[reminders] ${targets.length} unpaid member(s) to remind`);

  for (const m of targets) {
    const plan = db.plans.find((p) => p.id === m.planId) ?? { name: "", price: 0 };
    const text = fillTemplate(s.reminderTemplate, {
      name: m.name.split(" ")[0], gym: s.gymName, plan: plan.name, amount: money(plan.price), dueDate: fmtDate(m.dueDate),
    });
    try {
      const id = await client.getNumberId(m.phone);
      if (!id) { console.log(`[reminders] ${m.name}: number not on WhatsApp`); continue; }
      await send(id._serialized, text);
      await updateDb((fresh) => {
        fresh.reminders.push({ id: crypto.randomUUID(), memberId: m.id, kind: "fee", auto: true, date: today(), at: new Date().toISOString() });
      });
      console.log(`[reminders] sent to ${m.name}`);
    } catch (e) {
      console.error(`[reminders] ${m.name}:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 6000 + Math.random() * 6000)); // spread out to avoid spam flags
  }
}
setInterval(() => runReminders().catch((e) => console.error("[reminders]", e.message)), 10 * 60_000);
client.on("ready", () => setTimeout(() => runReminders().catch(() => {}), 30_000));

client.initialize().catch((e) => {
  console.error("[wa] could not start:", e.message);
  console.error("Tip: set CHROME_PATH in bot/.env to your Chrome, e.g. C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
});

process.on("SIGINT", async () => {
  await pushStatus({ state: "offline", qr: null });
  process.exit(0);
});
