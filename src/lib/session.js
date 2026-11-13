// Password hashing + signed session tokens (Node crypto only, no extra packages).
// Used by both the proxy and the server.
import crypto from "node:crypto";

export const SESSION_COOKIE = "gp_session";
export const SESSION_DAYS = 7;
const SECRET = process.env.SESSION_SECRET || "gympilot-demo-secret-change-me";

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(String(password), salt, 32);
  const expected = Buffer.from(hash, "hex");
  return expected.length === check.length && crypto.timingSafeEqual(check, expected);
}

function sign(body) {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}

/** payload: { uid, role } */
export function createSessionToken(payload) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + SESSION_DAYS * 86_400_000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Returns the payload if the token is valid and not expired, otherwise null. */
export function readSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
