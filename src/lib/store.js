// Key/value storage used by the app (and mirrored in bot/store.js).
// - Online (Vercel): Upstash Redis via its REST API, when the env vars are set.
// - Local PC: JSON files in ./data
import fs from "node:fs/promises";
import path from "node:path";

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PREFIX = "gympilot:";
const DATA_DIR = path.join(process.cwd(), "data");

export const storageKind = URL && TOKEN ? "upstash" : "file";

async function redis(command) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Database error: ${json.error || res.status}`);
  return json.result;
}

/** Returns the parsed value, or null if it doesn't exist. */
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

let fileQueue = Promise.resolve();

export async function writeKey(name, value) {
  if (storageKind === "upstash") {
    await redis(["SET", PREFIX + name, JSON.stringify(value)]);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("No database connected. In Vercel, open Storage → add Upstash Redis to this project, then redeploy.");
  }
  const job = fileQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${name}.json`);
    const json = JSON.stringify(value, null, 2);
    await fs.writeFile(file + ".tmp", json);
    await fs.rename(file + ".tmp", file).catch(() => fs.writeFile(file, json));
  });
  fileQueue = job.catch(() => {});
  return job;
}
