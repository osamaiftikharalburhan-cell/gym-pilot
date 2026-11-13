// Same storage as the web app (src/lib/store.js): Upstash Redis online, or ../data/*.json locally.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PREFIX = "gympilot:";
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");

export const storageKind = URL && TOKEN ? "upstash" : "file";

async function redis(command) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Database error: ${json.error || res.status}`);
  return json.result;
}

export async function readKey(name) {
  if (storageKind === "upstash") {
    const raw = await redis(["GET", PREFIX + name]);
    return raw ? JSON.parse(raw) : null;
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function writeKey(name, value) {
  if (storageKind === "upstash") {
    await redis(["SET", PREFIX + name, JSON.stringify(value)]);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${name}.json`);
  const json = JSON.stringify(value, null, 2);
  await fs.writeFile(file + ".tmp", json);
  await fs.rename(file + ".tmp", file).catch(() => fs.writeFile(file, json));
}

/** Re-read the latest db, apply a small change, save. Keeps the window for conflicts tiny. */
export async function updateDb(fn) {
  const db = await readKey("db");
  if (!db) throw new Error("No gym data yet — open the website once first.");
  fn(db);
  await writeKey("db", db);
}
