// Data Access Layer for the logged-in user (server only).
import { cache } from "react";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { readSessionToken, SESSION_COOKIE } from "./session";

/** Current user ({ id, name, username, role }) or null. Memoized per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await io(); // session expiry check reads the current time
  const session = readSessionToken(token);
  if (!session) return null;
  const db = await getDb();
  const user = db.users.find((u) => u.id === session.uid);
  if (!user) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
});

/** For pages: redirect to /login when signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For owner-only pages: staff are sent back to the dashboard. */
export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/");
  return user;
}

/** For server actions: throw instead of redirecting. */
export async function assertUser(role) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please sign in again.");
  if (role === "owner" && user.role !== "owner") throw new Error("Only the gym owner can do this.");
  return user;
}
