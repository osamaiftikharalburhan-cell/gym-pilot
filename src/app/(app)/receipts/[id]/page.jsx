import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Dumbbell, MessageCircle, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { buildReceiptText, getDb } from "@/lib/db";
import { displayPhone, fmtDate, money, whatsappLink } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { Card, PageSkeleton, btn, cx } from "@/components/ui";

export const metadata = { title: "Receipt" };

export default function ReceiptPage({ params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Receipt params={params} />
    </Suspense>
  );
}

async function Receipt({ params }) {
  const [{ id }, , db] = await Promise.all([params, requireUser(), getDb()]);
  const p = db.payments.find((x) => x.id === id);
  if (!p) notFound();
  const m = db.members.find((x) => x.id === p.memberId);
  const plan = db.plans.find((x) => x.id === m?.planId);
  const s = db.settings;
  const text = buildReceiptText(db, p);

  return (
    <>
      <div className="mx-auto mb-6 flex max-w-xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={m ? `/members/${m.id}` : "/payments"} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="flex gap-2">
          {m && (
            <a href={whatsappLink(m.phone, text)} target="_blank" rel="noopener" className={cx(btn.base, btn.whatsapp, "py-2")}>
              <MessageCircle className="size-4" /> Send on WhatsApp
            </a>
          )}
          <PrintButton><Printer className="size-4" /> Print</PrintButton>
        </div>
      </div>

      <Card className="mx-auto max-w-xl p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-200 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-ink"><Dumbbell className="size-5" strokeWidth={2.5} /></span>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.gymName}</p>
              <p className="text-xs text-gray-500">{s.address}</p>
              <p className="text-xs text-gray-500">{displayPhone(s.phone)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Receipt</p>
            <p className="text-lg font-semibold text-gray-900 tabular">#{p.receiptNo}</p>
            <p className="text-xs text-gray-500">{fmtDate(p.date)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-4 py-6 text-sm">
          <dt className="text-gray-500">Received from</dt>
          <dd className="text-right font-medium text-gray-900">{m?.name ?? "Deleted member"}</dd>
          {m && (<><dt className="text-gray-500">Phone</dt><dd className="text-right text-gray-900">{displayPhone(m.phone)}</dd></>)}
          <dt className="text-gray-500">Plan</dt>
          <dd className="text-right text-gray-900">{plan?.name ?? "—"}</dd>
          {p.note && (<><dt className="text-gray-500">For</dt><dd className="text-right text-gray-900">{p.note}</dd></>)}
          <dt className="text-gray-500">Payment method</dt>
          <dd className="text-right text-gray-900">{p.method}</dd>
          {m && (<><dt className="text-gray-500">Next due date</dt><dd className="text-right text-gray-900">{fmtDate(m.dueDate)}</dd></>)}
        </dl>

        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-5 py-4">
          <span className="text-sm font-medium text-gray-600">Amount paid</span>
          <span className="text-2xl font-bold text-gray-900 tabular">{money(p.amount)}</span>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">Thank you for training with us! This is a computer-generated receipt.</p>
      </Card>
    </>
  );
}
