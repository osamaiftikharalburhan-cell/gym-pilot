import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { EXPENSE_CATEGORIES, getDb, monthTotals, todayIso } from "@/lib/db";
import { fmtDate, money, monthLong, shiftMonth } from "@/lib/format";
import { Card, Empty, PageHeader, PageSkeleton, cx } from "@/components/ui";
import { AddExpenseButton, DeleteExpenseButton } from "./expense-actions";

export const metadata = { title: "Expenses" };

const CAT_COLOR = {
  Rent: "bg-violet-500", Salaries: "bg-sky-500", Utilities: "bg-amber-500", Maintenance: "bg-orange-500",
  Equipment: "bg-emerald-500", Marketing: "bg-pink-500", Other: "bg-gray-400",
};

export default function ExpensesPage({ searchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Expenses searchParams={searchParams} />
    </Suspense>
  );
}

async function Expenses({ searchParams }) {
  const [, db, sp] = await Promise.all([requireOwner(), getDb(), searchParams]);
  const today = todayIso();
  const current = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") && sp.month <= current ? sp.month : current;
  const list = db.expenses.filter((e) => e.date.startsWith(month));
  const totals = monthTotals(db, month);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, total: list.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Rent, salaries, bills and everything else you spend"
        action={<AddExpenseButton categories={EXPENSE_CATEGORIES} today={today} />}
      />

      <div className="mb-6 flex items-center gap-2">
        <Link href={`/expenses?month=${shiftMonth(month, -1)}`} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50" aria-label="Previous month"><ChevronLeft className="size-4" /></Link>
        <span className="min-w-36 text-center font-semibold text-gray-900">{monthLong(month)}</span>
        {month < current ? (
          <Link href={`/expenses?month=${shiftMonth(month, 1)}`} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50" aria-label="Next month"><ChevronRight className="size-4" /></Link>
        ) : <span className="rounded-lg border border-gray-100 p-2 text-gray-300"><ChevronRight className="size-4" /></span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <p className="text-sm text-gray-500">Total spent</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 tabular">{money(totals.expenses)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm">
              <div><p className="text-gray-500">Income</p><p className="font-semibold text-gray-900 tabular">{money(totals.income)}</p></div>
              <div><p className="text-gray-500">Profit</p><p className={cx("font-semibold tabular", totals.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{money(totals.profit)}</p></div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900">By category</h2>
            {byCat.length === 0 ? <p className="mt-3 text-sm text-gray-500">Nothing yet.</p> : (
              <ul className="mt-4 space-y-3">
                {byCat.map(({ c, total }) => (
                  <li key={c}>
                    <div className="flex justify-between text-sm"><span className="text-gray-700">{c}</span><span className="font-medium tabular">{money(total)}</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={cx("h-full rounded-full", CAT_COLOR[c])} style={{ width: `${(total / totals.expenses) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <h2 className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">All expenses <span className="font-normal text-gray-400">({list.length})</span></h2>
          {list.length === 0 ? (
            <Empty icon={ReceiptText} title="No expenses this month" text="Add rent, salaries, bills and other costs to see your real profit." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {list.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cx("size-2.5 shrink-0 rounded-full", CAT_COLOR[e.category])} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{e.note}</p>
                    <p className="text-xs text-gray-500">{e.category} · {fmtDate(e.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular">{money(e.amount)}</span>
                  <DeleteExpenseButton id={e.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
