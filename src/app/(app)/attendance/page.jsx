import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, CalendarCheck, QrCode, ScanLine, UserX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { fmtTime, getDb, memberViews, todayIso } from "@/lib/db";
import { addDays, shortDate } from "@/lib/format";
import { RemindButton } from "@/components/member-actions";
import { Avatar, Card, Empty, Kpi, PageHeader, PageSkeleton, StatusBadge, btn, cx } from "@/components/ui";
import { CheckInSearch } from "./check-in-search";

export const metadata = { title: "Attendance" };

export default function AttendancePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Attendance />
    </Suspense>
  );
}

async function Attendance() {
  const [, db] = await Promise.all([requireUser(), getDb()]);
  const today = todayIso();
  const members = memberViews(db, today);
  const byId = new Map(members.map((m) => [m.id, m]));
  const active = members.filter((m) => m.status !== "inactive" && m.status !== "frozen");

  const todayVisits = db.attendance.filter((a) => a.date === today).sort((a, b) => b.at.localeCompare(a.at));
  const unpaidToday = todayVisits.filter((a) => byId.get(a.memberId)?.status === "unpaid");
  const missing = active
    .filter((m) => m.daysSinceVisit >= db.settings.inactiveDays)
    .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);

  // Last 14 days check-in counts
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const counts = days.map((d) => db.attendance.filter((a) => a.date === d).length);
  const max = Math.max(...counts, 1);
  const avg = Math.round(counts.slice(0, 13).reduce((s, n) => s + n, 0) / 13);

  const searchList = active.map((m) => ({
    id: m.id, name: m.name, phone: m.phone, phoneLabel: m.phoneLabel, status: m.status, dueLabel: m.dueLabel, checkedInToday: m.checkedInToday,
  }));

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Check members in, spot unpaid fees at the door, and win back members who stopped coming"
        action={
          <Link href="/attendance/qr" className={cx(btn.base, btn.brand)}>
            <QrCode className="size-4" /> QR codes
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={ScanLine} label="Check-ins today" value={String(todayVisits.length)} hint={`Daily average ${avg}`} tone="sky" />
        <Kpi icon={AlertTriangle} label="Came in with unpaid fee" value={String(unpaidToday.length)} hint="Collect at the front desk" tone="red" />
        <Kpi icon={UserX} label={`Not seen in ${db.settings.inactiveDays}+ days`} value={String(missing.length)} hint="Send a come-back message" tone="amber" />
        <Kpi icon={CalendarCheck} label="Active members" value={String(active.length)} hint={`${Math.round((todayVisits.length / Math.max(active.length, 1)) * 100)}% came today`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900">Front desk check-in</h2>
            <p className="text-sm text-gray-500">Search by name or phone. Unpaid members are flagged in red.</p>
            <CheckInSearch members={searchList} />
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Today&apos;s check-ins</h2>
              <span className="text-sm text-gray-500">{todayVisits.length} total</span>
            </div>
            {todayVisits.length === 0 ? (
              <Empty icon={ScanLine} title="No check-ins yet today" text="Members can scan the QR code or you can check them in above." />
            ) : (
              <ul className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto">
                {todayVisits.map((a) => {
                  const m = byId.get(a.memberId);
                  if (!m) return null;
                  const unpaid = m.status === "unpaid";
                  return (
                    <li key={a.id} className={cx("relative flex items-center gap-3 px-5 py-3", unpaid && "bg-red-50/60")}>
                      {unpaid && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />}
                      <span className="w-16 shrink-0 text-xs font-medium text-gray-500 tabular">{fmtTime(a.at)}</span>
                      <Link href={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar name={m.name} alert={unpaid} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                          <p className={cx("text-xs", unpaid ? "font-medium text-red-600" : "text-gray-500")}>{unpaid ? `Fee ${m.dueLabel}` : m.planName}</p>
                        </div>
                      </Link>
                      {unpaid && <StatusBadge status="unpaid" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900">Last 14 days</h2>
            <div className="mt-5 flex h-32 items-end gap-1">
              {days.map((d, i) => (
                <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${shortDate(d)}: ${counts[i]} check-ins`}>
                  <div className={cx("w-full rounded-t", d === today ? "bg-ink" : "bg-gray-200")} style={{ height: `${Math.max((counts[i] / max) * 100, 3)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-gray-400">
              <span>{shortDate(days[0])}</span><span>Today</span>
            </div>
          </Card>

          <Card>
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Members who stopped coming</h2>
              <p className="text-sm text-gray-500">No visit in {db.settings.inactiveDays}+ days — they might quit soon</p>
            </div>
            {missing.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">Everyone is showing up 💪</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {missing.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <Link href={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={m.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-amber-700">Last visit {m.lastVisitLabel}</p>
                      </div>
                    </Link>
                    <RemindButton memberId={m.id} phone={m.phone} text={m.comebackText} kind="comeback" labelText="Message" small />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
