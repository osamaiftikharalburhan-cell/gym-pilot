import Link from "next/link";
import { Suspense } from "react";
import { Dumbbell, LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ActiveNav, NavList } from "./nav";
import { Avatar, cx } from "./ui";

export function Logo({ dark, size = "md" }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={cx("flex items-center justify-center rounded-xl bg-brand text-ink", size === "lg" ? "size-12" : "size-9")}>
        <Dumbbell className={size === "lg" ? "size-6" : "size-5"} strokeWidth={2.5} />
      </span>
      <span className={cx("font-bold tracking-tight", size === "lg" ? "text-2xl" : "text-lg", dark ? "text-white" : "text-ink")}>
        Gym<span className={dark ? "text-brand" : "text-brand-dark"}>Pilot</span>
      </span>
    </Link>
  );
}

async function UserNav({ variant }) {
  const [user, db] = await Promise.all([getCurrentUser(), getDb()]);
  const pending = (db.admissions ?? []).filter((a) => a.status === "pending").length;
  return <ActiveNav variant={variant} role={user?.role ?? null} pending={pending} />;
}

async function UserCard() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="text-xs capitalize text-gray-400">{user.role}</p>
      </div>
      <form action={logout}>
        <button className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white" title="Sign out" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

async function MobileUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <form action={logout} className="flex items-center gap-2">
      <span className="text-xs capitalize text-gray-500">{user.name}</span>
      <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500" aria-label="Sign out"><LogOut className="size-4" /></button>
    </form>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink px-4 py-6 print:hidden lg:flex">
        <div className="px-2"><Logo dark /></div>
        <nav className="mt-10 flex flex-col gap-1">
          <Suspense fallback={<NavList variant="desktop" />}>
            <UserNav variant="desktop" />
          </Suspense>
        </nav>
        <div className="mt-auto">
          <Suspense fallback={<div className="h-15 rounded-xl bg-white/5" />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden lg:hidden">
        <Logo />
        <Suspense fallback={null}><MobileUser /></Suspense>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden">
        <Suspense fallback={<NavList variant="mobile" />}>
          <UserNav variant="mobile" />
        </Suspense>
      </nav>
    </>
  );
}
