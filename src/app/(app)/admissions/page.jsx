import Link from "next/link";
import { Suspense } from "react";
import { QrCode, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { buildWelcomeText, fmtTime, getDb, todayIso } from "@/lib/db";
import { diffDays, displayPhone, money, relativeDays } from "@/lib/format";
import { zonedDate } from "@/lib/time";
import { Avatar, Card, Empty, PageHeader, PageSkeleton, btn, cx } from "@/components/ui";
import { AdmissionActions } from "./admission-actions";

export const metadata = { title: "Admissions" };

export default function AdmissionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Admissions />
    </Suspense>
  );
}

async function Admissions() {
  const [, db] = await Promise.all([requireUser(), getDb()]);
  const today = todayIso();
  const plans = new Map(db.plans.map((p) => [p.id, p]));
  const all = db.admissions ?? [];
  const pending = all.filter((a) => a.status === "pending");
  const handled = all.filter((a) => a.status !== "pending").sort((a, b) => (b.handledAt ?? "").localeCompare(a.handledAt ?? "")).slice(0, 8);
  const fee = db.settings.admissionFee || 0;
  const when = (iso) => {
    const d = diffDays(today, zonedDate(new Date(iso)));
    return `${relativeDays(d)} at ${fmtTime(iso)}`;
  };

  return (
    <>
      <PageHeader
        title="Admissions"
        subtitle="People who scanned the Join QR code. Take their first payment to make them members."
        action={<Link href="/attendance/qr" className={cx(btn.base, btn.brand)}><QrCode className="size-4" /> Join QR code</Link>}
      />

      <Card>
        <h2 className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">
          New requests
          <span className={cx("rounded-full px-2 text-xs font-medium", pending.length ? "bg-brand text-ink" : "bg-gray-100 text-gray-600")}>{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <Empty icon={UserPlus} title="No new requests" text="Print the Join QR code and put it at your reception or on social media." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {pending.map((a) => {
              const plan = plans.get(a.planId) ?? db.plans[0];
              return (
                <li key={a.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={a.name} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{a.name} <span className="text-xs font-normal text-gray-400">· {a.gender}</span></p>
                      <p className="text-xs text-gray-500">{displayPhone(a.phone)} · Requested {when(a.at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs lg:w-[300px]">
                    <span className="rounded-full bg-ink px-2.5 py-1 font-medium text-white">{plan.name} · {money(plan.price)}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{a.timing}</span>
                    {a.goal && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{a.goal}</span>}
                  </div>
                  <AdmissionActions
                    id={a.id}
                    name={a.name}
                    phone={a.phone}
                    total={plan.price + fee}
                    breakdown={fee ? `${money(plan.price)} ${plan.name} + ${money(fee)} admission` : `${plan.name}`}
                    welcomeText={buildWelcomeText(db.settings, a, plan)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {handled.length > 0 && (
        <Card className="mt-6">
          <h2 className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Recently handled</h2>
          <ul className="divide-y divide-gray-100">
            {handled.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-500">{displayPhone(a.phone)}</p>
                </div>
                {a.status === "approved" ? (
                  <Link href={`/members/${a.memberId}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Joined →</Link>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">Removed</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
