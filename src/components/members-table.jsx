"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { money } from "@/lib/format";
import { PayButton, RemindButton } from "./member-actions";
import { Avatar, Empty, StatusBadge, cx } from "./ui";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "due", label: "Due soon" },
  { id: "paid", label: "Paid" },
  { id: "frozen", label: "Frozen" },
  { id: "inactive", label: "Left" },
];
const ORDER = { unpaid: 0, due: 1, paid: 2, frozen: 3, inactive: 4 };
const DUE_TEXT = {
  unpaid: "font-medium text-red-600",
  due: "text-amber-700",
  paid: "text-gray-500",
  frozen: "text-sky-700",
  inactive: "text-gray-400",
};

export function MembersTable({ members, initialFilter = "all" }) {
  const [filter, setFilter] = useState(initialFilter);
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = { all: 0, unpaid: 0, due: 0, paid: 0, frozen: 0, inactive: 0 };
    for (const m of members) {
      c[m.status]++;
      if (m.status !== "inactive") c.all++;
    }
    return c;
  }, [members]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, "").replace(/^0/, "");
    return members
      .filter((m) => (filter === "all" ? m.status !== "inactive" : m.status === filter))
      .filter((m) => !s || m.name.toLowerCase().includes(s) || (digits.length > 2 && m.phone.includes(digits)))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.daysLeft - b.daysLeft);
  }, [members, filter, q]);

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
                filter === f.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
              )}
            >
              {f.label}
              <span className={cx("rounded-full px-1.5 text-xs tabular", f.id === "unpaid" && counts.unpaid ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600")}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Users} title="No members found" text="Try a different filter or search." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((m) => (
            <li
              key={m.id}
              className={cx(
                "relative flex flex-col gap-3 px-4 py-3.5 transition hover:bg-gray-50/70 sm:flex-row sm:items-center",
                m.status === "unpaid" && "bg-red-50/40",
                m.status === "inactive" && "opacity-70",
              )}
            >
              {m.status === "unpaid" && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" aria-hidden />}
              <Link href={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={m.name} alert={m.status === "unpaid"} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{m.name}</p>
                  <p className="truncate text-xs text-gray-500">{m.phoneLabel} · {m.planName} · Last visit {m.lastVisitLabel}</p>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-4 sm:w-[300px] sm:justify-start">
                <div className="w-32">
                  <StatusBadge status={m.status} />
                  <p className={cx("mt-1 text-xs", DUE_TEXT[m.status])}>{m.dueLabel}</p>
                </div>
                <div className="text-right sm:text-left">
                  <p className="text-sm font-semibold text-gray-900 tabular">{money(m.planPrice)}</p>
                  <p className="text-xs text-gray-400">{m.lastReminderLabel ? `Reminded ${m.lastReminderLabel}` : m.planMonths === 1 ? "per month" : `per ${m.planMonths} months`}</p>
                </div>
              </div>
              <div className="flex gap-2 sm:w-[220px] sm:justify-end">
                {(m.status === "unpaid" || m.status === "due") && (
                  <RemindButton memberId={m.id} phone={m.phone} text={m.reminderText} remindedToday={m.remindedToday} small />
                )}
                {m.status !== "inactive" && m.status !== "frozen" && (
                  <PayButton memberId={m.id} name={m.name} amount={m.planPrice} small />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
