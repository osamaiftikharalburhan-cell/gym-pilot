import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, PiggyBank, ScanLine, UserPlus, Users, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { fmtTime, getDb, memberViews, monthTotals, todayIso } from "@/lib/db";
import { addDays, addMonths, fmtDate, money, monthLabel, shiftMonth, shortMoney } from "@/lib/format";
import { MemberFormButton, RemindButton } from "@/components/member-actions";
import { Avatar, Card, Kpi, PageSkeleton, StatusBadge, cx } from "@/components/ui";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const [user, db] = await Promise.all([requireUser(), getDb()]);
  const isOwner = user.role === "owner";
  const today = todayIso();
  const month = today.slice(0, 7);
  const members = memberViews(db, today);
  const byId = new Map(members.map((m) => [m.id, m]));

  const active = members.filter((m) => m.status !== "inactive" && m.status !== "frozen");
  const unpaid = members.filter((m) => m.status === "unpaid").sort((a, b) => a.daysLeft - b.daysLeft);
  const due = members.filter((m) => m.status === "due").sort((a, b) => a.daysLeft - b.daysLeft);
  const paid = members.filter((m) => m.status === "paid");
  const pendingAmount = unpaid.reduce((s, m) => s + m.planPrice, 0);
  const weekEnd = addDays(today, 7);
  const dueThisWeek = active.filter((m) => m.dueDate >= today && m.dueDate <= weekEnd);
  const todayVisits = db.attendance.filter((a) => a.date === today).sort((a, b) => b.at.localeCompare(a.at));
  const unpaidInToday = todayVisits.filter((a) => byId.get(a.memberId)?.status === "unpaid").length;

  const thisMonth = monthTotals(db, month);
  const lastMonth = monthTotals(db, shiftMonth(month, -1));
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const series = months.map((ym) => ({ ym, ...monthTotals(db, ym) }));
  const max = Math.max(...series.map((s) => Math.max(s.income, s.expenses)), 1);
  const recent = db.payments.slice(0, 6);
  const newAdmissions = (db.admissions ?? []).filter((a) => a.status === "pending");
  const pct = (n) => (active.length ? (n / active.length) * 100 : 0);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{fmtDate(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Welcome back, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening at {db.settings.gymName} today</p>
        </div>
        <MemberFormButton plans={db.plans} defaultDueDate={addMonths(today, 1)} />
      </div>

      {newAdmissions.length > 0 && (
        <Link
          href="/admissions"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-dark/30 bg-brand/25 p-4 transition hover:bg-brand/40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-brand"><UserPlus className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">
              {newAdmissions.length} new admission request{newAdmissions.length === 1 ? "" : "s"}
            </p>
            <p className="truncate text-sm text-gray-600">{newAdmissions.map((a) => a.name).join(", ")} — scanned the Join QR code</p>
          </div>
          <span className="hidden items-center gap-1 text-sm font-medium text-gray-900 sm:flex">Review <ArrowRight className="size-4" /></span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={Users} label="Active members" value={String(active.length)} hint={`${paid.length} paid · ${due.length} due soon`} />
        {isOwner ? (
          <Kpi icon={Wallet} label="Collected this month" value={shortMoney(thisMonth.income)} hint={`Last month ${shortMoney(lastMonth.income)}`} tone="brand" />
        ) : (
          <Kpi icon={CalendarClock} label="Due this week" value={String(dueThisWeek.length)} hint="In the next 7 days" tone="amber" />
        )}
        <Kpi
          icon={AlertTriangle}
          label="Unpaid fees"
          value={String(unpaid.length)}
          hint={isOwner ? `${money(pendingAmount)} pending` : "Members with overdue fees"}
          tone="red"
        />
        <Kpi
          icon={ScanLine}
          label="Check-ins today"
          value={String(todayVisits.length)}
          hint={unpaidInToday ? `${unpaidInToday} with unpaid fees` : "All clear"}
          tone="sky"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {isOwner ? (
          <Card className="p-5 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">Income vs expenses</h2>
                <p className="text-sm text-gray-500">Last 6 months</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink" />Income</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-gray-300" />Expenses</span>
              </div>
            </div>
            <div className="mt-6 flex h-52 items-end gap-2 sm:gap-4">
              {series.map((s) => (
                <div key={s.ym} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className={cx("text-[11px] font-medium tabular", s.profit >= 0 ? "text-emerald-600" : "text-red-600")} title="Profit">
                    {s.profit >= 0 ? "+" : ""}{shortMoney(s.profit)}
                  </span>
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div className="w-1/2 max-w-6 rounded-t-md bg-ink" style={{ height: `${Math.max((s.income / max) * 100, 2)}%` }} title={`Income ${money(s.income)}`} />
                    <div className="w-1/2 max-w-6 rounded-t-md bg-gray-300" style={{ height: `${Math.max((s.expenses / max) * 100, 2)}%` }} title={`Expenses ${money(s.expenses)}`} />
                  </div>
                  <span className={cx("text-xs", s.ym === month ? "font-semibold text-gray-900" : "text-gray-500")}>{monthLabel(s.ym)}</span>
                </div>
              ))}
            </div>
            <Link href="/reports" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900">
              <PiggyBank className="size-4" /> Profit this month: <span className={thisMonth.profit >= 0 ? "text-emerald-600" : "text-red-600"}>{money(thisMonth.profit)}</span>
              <ArrowRight className="size-4" />
            </Link>
          </Card>
        ) : (
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Today&apos;s check-ins</h2>
              <Link href="/attendance" className="text-sm font-medium text-gray-700 hover:text-gray-900">Open attendance</Link>
            </div>
            <CheckinList visits={todayVisits.slice(0, 7)} byId={byId} />
          </Card>
        )}

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Fee status</h2>
          <p className="text-sm text-gray-500">Who has paid and who hasn&apos;t</p>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-emerald-500" style={{ width: `${pct(paid.length)}%` }} />
            <div className="bg-amber-400" style={{ width: `${pct(due.length)}%` }} />
            <div className="bg-red-500" style={{ width: `${pct(unpaid.length)}%` }} />
          </div>
          <ul className="mt-5 space-y-1">
            {[
              { label: "Paid", n: paid.length, dot: "bg-emerald-500", href: "/members?status=paid" },
              { label: "Due soon", n: due.length, dot: "bg-amber-400", href: "/members?status=due" },
              { label: "Unpaid", n: unpaid.length, dot: "bg-red-500", href: "/members?status=unpaid" },
            ].map((r) => (
              <li key={r.label}>
                <Link href={r.href} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                  <span className="flex items-center gap-2 text-gray-700"><span className={cx("size-2.5 rounded-full", r.dot)} />{r.label}</span>
                  <span className="font-semibold text-gray-900 tabular">{r.n} <span className="font-normal text-gray-400">({Math.round(pct(r.n))}%)</span></span>
                </Link>
              </li>
            ))}
          </ul>
          {isOwner && (
            <div className="mt-5 rounded-xl bg-red-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">Pending amount</p>
              <p className="mt-1 text-2xl font-semibold text-red-700 tabular">{money(pendingAmount)}</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-gray-900"><span className="size-2 rounded-full bg-red-500" /> Fees not received</h2>
              <p className="text-sm text-gray-500">Most overdue first</p>
            </div>
            <Link href="/reminders" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900">
              Remind all <ArrowRight className="size-4" />
            </Link>
          </div>
          {unpaid.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">Great — everyone has paid! 🎉</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {unpaid.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <Link href={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={m.name} alert />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs font-medium text-red-600">{m.dueLabel} · {money(m.planPrice)}</p>
                    </div>
                  </Link>
                  <RemindButton memberId={m.id} phone={m.phone} text={m.reminderText} remindedToday={m.remindedToday} small />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isOwner ? (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Recent payments</h2>
              <Link href="/payments" className="text-sm font-medium text-gray-700 hover:text-gray-900">View all</Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {recent.map((p) => {
                const m = byId.get(p.memberId);
                return (
                  <li key={p.id}>
                    <Link href={`/receipts/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <Avatar name={m?.name ?? "?"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{m?.name ?? "Deleted member"}</p>
                        <p className="text-xs text-gray-500">{fmtDate(p.date)} · {p.method}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 tabular">+{money(p.amount)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-900">Due soon</h2>
            <p className="text-sm text-gray-500">Fees due in the next few days</p>
            <ul className="mt-4 space-y-2">
              {due.length === 0 && <li className="text-sm text-gray-500">Nothing due soon.</li>}
              {due.map((m) => (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-2 pr-3 hover:bg-amber-100">
                    <Avatar name={m.name} />
                    <span className="flex-1 truncate text-sm font-medium text-gray-800">{m.name}</span>
                    <span className="text-xs text-amber-700">{m.dueLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {isOwner && due.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="font-semibold text-gray-900">Fees due soon</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {due.map((m) => (
              <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 py-1 pl-1 pr-3 text-sm hover:bg-amber-100">
                <Avatar name={m.name} />
                <span className="font-medium text-gray-800">{m.name}</span>
                <StatusBadge status="due" />
                <span className="text-xs text-amber-700">{m.dueLabel}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function CheckinList({ visits, byId }) {
  if (!visits.length) return <p className="px-5 py-12 text-center text-sm text-gray-500">No check-ins yet today.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {visits.map((a) => {
        const m = byId.get(a.memberId);
        if (!m) return null;
        return (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={m.name} alert={m.status === "unpaid"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
              <p className="text-xs text-gray-500">{fmtTime(a.at)}</p>
            </div>
            {m.status === "unpaid" && <StatusBadge status="unpaid" />}
          </li>
        );
      })}
    </ul>
  );
}
