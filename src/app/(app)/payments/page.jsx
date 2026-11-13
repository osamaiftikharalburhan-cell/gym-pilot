import Link from "next/link";
import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { getDb, PAYMENT_METHODS, todayIso } from "@/lib/db";
import { fmtDate, money, monthLong, shiftMonth } from "@/lib/format";
import { Avatar, Card, PageHeader, PageSkeleton } from "@/components/ui";

export const metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Payments />
    </Suspense>
  );
}

const METHOD_STYLE = {
  Cash: "bg-gray-100 text-gray-700",
  JazzCash: "bg-rose-50 text-rose-700",
  EasyPaisa: "bg-emerald-50 text-emerald-700",
  Bank: "bg-sky-50 text-sky-700",
};

async function Payments() {
  const [, db] = await Promise.all([requireOwner(), getDb()]);
  const month = todayIso().slice(0, 7);
  const names = new Map(db.members.map((m) => [m.id, m.name]));
  const payments = db.payments;
  const sum = (ym) => payments.filter((p) => p.date.startsWith(ym)).reduce((s, p) => s + p.amount, 0);
  const byMethod = PAYMENT_METHODS.map((m) => ({
    m, total: payments.filter((p) => p.method === m && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0),
  }));

  const groups = new Map();
  for (const p of payments.slice(0, 150)) {
    const k = p.date.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }

  return (
    <>
      <PageHeader title="Payments" subtitle="Every fee received, with receipts" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-gray-500">This month</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 tabular">{money(sum(month))}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Last month</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 tabular">{money(sum(shiftMonth(month, -1)))}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">This month by method</p>
          <ul className="mt-2 space-y-1 text-sm">
            {byMethod.map(({ m, total }) => (
              <li key={m} className="flex justify-between"><span className="text-gray-600">{m}</span><span className="font-medium tabular">{money(total)}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 space-y-6">
        {[...groups.entries()].map(([ym, list]) => (
          <Card key={ym}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="font-semibold text-gray-900">{monthLong(ym)}</h2>
              <span className="text-sm font-semibold text-emerald-600 tabular">{money(list.reduce((s, p) => s + p.amount, 0))}</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {list.map((p) => {
                const name = names.get(p.memberId) ?? "Deleted member";
                return (
                  <li key={p.id}>
                    <Link href={`/receipts/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">{fmtDate(p.date)} · Receipt #{p.receiptNo}</p>
                      </div>
                      <span className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${METHOD_STYLE[p.method]}`}>{p.method}</span>
                      <span className="w-24 text-right text-sm font-semibold text-gray-900 tabular">{money(p.amount)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
