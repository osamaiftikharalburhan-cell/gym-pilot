import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

// Optimistic check: send signed-out visitors to /login.
// Real permission checks happen in src/lib/auth.js for every page and action.
export function proxy(request) {
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Public: /login, /checkin and /join (opened on people's phones), Next.js assets.
  matcher: ["/((?!login|checkin|join|_next/static|_next/image|favicon.ico).*)"],
};
