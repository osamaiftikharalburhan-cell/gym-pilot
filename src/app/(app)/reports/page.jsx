import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, PiggyBank, Receipt, Wallet } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { EXPENSE_CATEGORIES, getDb, memberViews, monthTotals, PAYMENT_METHODS, todayIso } from "@/lib/db";
import { money, monthLabel, monthLong, shiftMonth, shortMoney } from "@/lib/format";
import { Card, Kpi, PageHeader, PageSkeleton, btn, cx } from "@/components/ui";

export const metadata = { title: "Reports" };

export default function ReportsPage({ searchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

function Change({ now, before, invert }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  const good = invert ? pct <= 0 : pct >= 0;
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cx("inline-flex items-center gap-0.5 font-medium", good ? "text-emerald-600" : "text-red-600")}>
      <Icon className="size-3.5" />{Math.abs(pct)}%
    </span>
  );
}

async function Reports({ searchParams }) {
  const [, db, sp] = await Promise.all([requireOwner(), getDb(), searchParams]);
  const today = todayIso();
  const current = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") && sp.month <= current ? sp.month : current;
  const prev = shiftMonth(month, -1);
  const t = monthTotals(db, month);
  const p = monthTotals(db, prev);
  const margin = t.income ? Math.round((t.profit / t.income) * 100) : 0;

  const series = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((ym) => ({ ym, ...monthTotals(db, ym) }));
  const max = Math.max(...series.map((s) => Math.max(s.income, s.expenses)), 1);

  const monthPayments = db.payments.filter((x) => x.date.startsWith(month));
  const byMethod = PAYMENT_METHODS.map((m) => ({ m, total: monthPayments.filter((x) => x.method === m).reduce((s, x) => s + x.amount, 0) }));
  const monthExpenses = db.expenses.filter((e) => e.date.startsWith(month));
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, total: monthExpenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.total).sort((a, b) => b.total - a.total);

  const plans = new Map(db.plans.map((pl) => [pl.id, { ...pl, members: 0, revenue: 0 }]));
  const members = memberViews(db, today);
  for (const m of members) if (m.status !== "inactive") plans.get(m.planId).members++;
  const memberPlan = new Map(db.members.map((m) => [m.id, m.planId]));
  for (const x of monthPayments) { const pl = plans.get(memberPlan.get(x.memberId)); if (pl) pl.revenue += x.amount; }
  const joined = db.members.filter((m) => m.joinDate.startsWith(month)).length;
  const left = db.members.filter((m) => m.leftAt?.startsWith(month)).length;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Your real profit: fees collected minus everything you spent"
        action={
          <a href={`/api/report?month=${month}`} className={cx(btn.base, btn.outline)}>
            <Download className="size-4" /> Download CSV
          </a>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <Link href={`/reports?month=${prev}`} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50" aria-label="Previous month"><ChevronLeft className="size-4" /></Link>
        <span className="min-w-36 text-center font-semibold text-gray-900">{monthLong(month)}</span>
        {month < current ? (
          <Link href={`/reports?month=${shiftMonth(month, 1)}`} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50" aria-label="Next month"><ChevronRight className="size-4" /></Link>
        ) : <span className="rounded-lg border border-gray-100 p-2 text-gray-300"><ChevronRight className="size-4" /></span>}
        {month === current && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Month in progress</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Income" value={shortMoney(t.income)} hint={<><Change now={t.income} before={p.income} /> vs {monthLabel(prev)}</>} tone="brand" />
        <Kpi icon={Receipt} label="Expenses" value={shortMoney(t.expenses)} hint={<><Change now={t.expenses} before={p.expenses} invert /> vs {monthLabel(prev)}</>} tone="amber" />
        <Kpi icon={PiggyBank} label="Net profit" value={shortMoney(t.profit)} hint={`${margin}% profit margin`} tone="green" valueTone={t.profit >= 0 ? "green" : "red"} />
        <Kpi icon={ArrowUpRight} label="New members" value={String(joined)} hint={`${left} left this month`} tone="sky" />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Profit trend</h2>
            <p className="text-sm text-gray-500">6 months up to {monthLong(month)}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink" />Income</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-gray-300" />Expenses</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-6 gap-2 sm:gap-6">
          {series.map((s) => (
            <Link key={s.ym} href={`/reports?month=${s.ym}`} className="group flex flex-col items-center gap-2">
              <span className={cx("text-xs font-semibold tabular", s.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{shortMoney(s.profit)}</span>
              <div className="flex h-44 w-full items-end justify-center gap-1">
                <div className="w-1/2 max-w-8 rounded-t-md bg-ink transition group-hover:opacity-80" style={{ height: `${Math.max((s.income / max) * 100, 2)}%` }} />
                <div className="w-1/2 max-w-8 rounded-t-md bg-gray-300 transition group-hover:opacity-80" style={{ height: `${Math.max((s.expenses / max) * 100, 2)}%` }} />
              </div>
              <span className={cx("text-xs", s.ym === month ? "rounded-full bg-ink px-2 py-0.5 font-semibold text-white" : "text-gray-500")}>{monthLabel(s.ym)}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">Income by method</h2>
          <ul className="mt-4 space-y-3">
            {byMethod.map(({ m, total }) => (
              <li key={m}>
                <div className="flex justify-between text-sm"><span className="text-gray-700">{m}</span><span className="font-medium tabular">{money(total)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-ink" style={{ width: `${t.income ? (total / t.income) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Where the money went</h2>
            <Link href={`/expenses?month=${month}`} className="text-xs font-medium text-gray-500 hover:text-gray-900">Details</Link>
          </div>
          {byCat.length === 0 ? <p className="mt-4 text-sm text-gray-500">No expenses recorded.</p> : (
            <ul className="mt-4 space-y-3">
              {byCat.map(({ c, total }) => (
                <li key={c}>
                  <div className="flex justify-between text-sm"><span className="text-gray-700">{c}</span><span className="font-medium tabular">{money(total)}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${(total / t.expenses) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">Plans</h2>
          <ul className="mt-4 divide-y divide-gray-100">
            {[...plans.values()].map((pl) => (
              <li key={pl.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{pl.name}</p>
                  <p className="text-xs text-gray-500">{pl.members} members · {money(pl.price)}</p>
                </div>
                <span className="font-semibold text-gray-900 tabular">{money(pl.revenue)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
