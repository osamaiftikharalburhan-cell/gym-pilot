"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, BellRing, CreditCard, LayoutDashboard, Menu, ReceiptText, ScanLine, Settings, UserPlus, Users, X,
} from "lucide-react";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/members", label: "Members", short: "Members", icon: Users },
  { href: "/admissions", label: "Admissions", short: "Join", icon: UserPlus, badge: true },
  { href: "/attendance", label: "Attendance", short: "Check-in", icon: ScanLine },
  { href: "/reminders", label: "Reminders", short: "Remind", icon: BellRing },
  { href: "/payments", label: "Payments", icon: CreditCard, owner: true },
  { href: "/expenses", label: "Expenses", icon: ReceiptText, owner: true },
  { href: "/reports", label: "Reports", icon: BarChart3, owner: true },
  { href: "/settings", label: "Settings", icon: Settings, owner: true },
];

function itemsFor(role) {
  return NAV.filter((i) => !i.owner || role === "owner");
}

function isActive(path, href) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Badge({ n, dark }) {
  if (!n) return null;
  return (
    <span className={cx("ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5", dark ? "bg-brand text-ink" : "bg-red-500 text-white")}>
      {n}
    </span>
  );
}

/** Pure render, also used as the Suspense fallback. */
export function NavList({ variant, path = "", role = null, pending = 0 }) {
  const items = itemsFor(role);

  if (variant === "mobile") {
    return <MobileNav items={items} path={path} pending={pending} />;
  }

  return (
    <>
      {items.map(({ href, label, icon: Icon, owner, badge }, i) => {
        const active = isActive(path, href);
        return (
          <div key={href}>
            {owner && !items[i - 1]?.owner && (
              <p className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Business</p>
            )}
            <Link
              href={href}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cx("size-[18px]", active && "text-brand")} />
              {label}
              {badge && <Badge n={pending} dark />}
            </Link>
          </div>
        );
      })}
    </>
  );
}

function MobileNav({ items, path, pending }) {
  const [open, setOpen] = useState(false);
  const main = items.slice(0, 4);
  const more = items.slice(4);
  return (
    <>
      {main.map(({ href, short, icon: Icon, badge }) => (
        <Link
          key={href}
          href={href}
          className={cx("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive(path, href) ? "text-ink" : "text-gray-400")}
        >
          <Icon className="size-5" />
          {short}
          {badge && pending > 0 && (
            <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{pending}</span>
          )}
        </Link>
      ))}
      {more.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", more.some((i) => isActive(path, i.href)) ? "text-ink" : "text-gray-400")}
        >
          <Menu className="size-5" />
          More
        </button>
      ) : (
        <span />
      )}
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/50" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-gray-900">More</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400" aria-label="Close"><X className="size-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {more.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cx("flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium", isActive(path, href) ? "border-ink bg-ink text-white" : "border-gray-200 text-gray-700")}
                >
                  <Icon className="size-4" /> {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ActiveNav({ variant, role, pending }) {
  return <NavList variant={variant} path={usePathname()} role={role} pending={pending} />;
}
