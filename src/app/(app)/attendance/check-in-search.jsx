"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CheckInButton } from "@/components/member-actions";
import { Avatar, StatusBadge, cx } from "@/components/ui";

export function CheckInSearch({ members }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const digits = s.replace(/\D/g, "").replace(/^0/, "");
    return members
      .filter((m) => m.name.toLowerCase().includes(s) || (digits.length > 2 && m.phone.includes(digits)))
      .slice(0, 6);
  }, [members, q]);

  return (
    <div className="mt-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name or phone number..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
      </label>
      {q && (
        <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No active member found.</li>}
          {results.map((m) => (
            <li key={m.id} className={cx("flex items-center gap-3 px-4 py-2.5", m.status === "unpaid" && "bg-red-50/60")}>
              <Avatar name={m.name} alert={m.status === "unpaid"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                <p className={cx("text-xs", m.status === "unpaid" ? "font-medium text-red-600" : "text-gray-500")}>
                  {m.status === "unpaid" ? `Fee ${m.dueLabel} — collect payment` : m.phoneLabel}
                </p>
              </div>
              {m.status !== "paid" && <StatusBadge status={m.status} />}
              <CheckInButton memberId={m.id} done={m.checkedInToday} small />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
