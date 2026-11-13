import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BellRing, CalendarCheck, CalendarDays, Phone, Receipt, StickyNote } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { fmtTime, getDb, memberViews, todayIso } from "@/lib/db";
import { addDays, fmtDate, money } from "@/lib/format";
import {
  CheckInButton, DeleteMemberButton, MemberFormButton, MembershipButtons, PayButton, RemindButton,
} from "@/components/member-actions";
import { Avatar, Card, PageSkeleton, StatusBadge, cx } from "@/components/ui";

export default function MemberPage({ params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MemberDetail params={params} />
    </Suspense>
  );
}

const BANNER = {
  unpaid: ["border-red-200 bg-red-50 text-red-800", "Fee not received yet"],
  due: ["border-amber-200 bg-amber-50 text-amber-800", "Fee is due soon"],
  paid: ["border-emerald-200 bg-emerald-50 text-emerald-800", "Fee is paid"],
  frozen: ["border-sky-200 bg-sky-50 text-sky-800", "Membership is frozen"],
  inactive: ["border-gray-200 bg-gray-50 text-gray-700", "This member has left the gym"],
};

async function MemberDetail({ params }) {
  const [{ id }, user, db] = await Promise.all([params, requireUser(), getDb()]);
  const isOwner = user.role === "owner";
  const today = todayIso();
  const m = memberViews(db, today).find((x) => x.id === id);
  if (!m) notFound();

  const payments = db.payments.filter((p) => p.memberId === id);
  const reminders = db.reminders.filter((r) => r.memberId === id).sort((a, b) => b.at.localeCompare(a.at));
  const visits = db.attendance.filter((a) => a.memberId === id).sort((a, b) => b.at.localeCompare(a.at));
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const [bannerCls, bannerTitle] = BANNER[m.status];

  // Last 28 days attendance strip
  const visitDays = new Set(visits.map((v) => v.date));
  const strip = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));

  return (
    <>
      <Link href="/members" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-4" /> Members
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={m.name} size="lg" alert={m.status === "unpaid"} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{m.name}</h1>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-1 text-sm text-gray-500">{m.planName} · {money(m.planPrice)} · Member since {fmtDate(m.joinDate)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <MemberFormButton
              plans={db.plans}
              defaultDueDate={m.dueDate}
              initial={{ id: m.id, name: m.name, phone: m.phone, gender: m.gender, planId: m.planId, dueDate: m.dueDate, notes: m.notes }}
            />
            <MembershipButtons memberId={m.id} name={m.name} status={m.status} />
            {isOwner && <DeleteMemberButton memberId={m.id} name={m.name} />}
          </div>
        </div>

        <div className={cx("mt-6 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", bannerCls)}>
          <div>
            <p className="text-sm font-semibold">{bannerTitle}</p>
            <p className="text-sm opacity-80">
              {m.dueLabel}
              {m.status !== "inactive" && m.status !== "frozen" && ` · Due date ${fmtDate(m.dueDate)}`}
              {m.status === "frozen" && " · The due date will move forward when unfrozen"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.status !== "inactive" && <CheckInButton memberId={m.id} done={m.checkedInToday} />}
            {(m.status === "unpaid" || m.status === "due") && (
              <RemindButton memberId={m.id} phone={m.phone} text={m.reminderText} remindedToday={m.remindedToday} />
            )}
            {m.status !== "frozen" && <PayButton memberId={m.id} name={m.name} amount={m.planPrice} />}
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={Phone} label="WhatsApp" value={m.phoneLabel} />
          <Info icon={CalendarDays} label="Last payment" value={m.lastPaidLabel ?? "—"} />
          <Info icon={Receipt} label="Total paid" value={money(totalPaid)} />
          <Info icon={CalendarCheck} label="Visits this month" value={`${m.visitsThisMonth} · last ${m.lastVisitLabel}`} />
          {m.notes && <Info icon={StickyNote} label="Notes" value={m.notes} />}
        </dl>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Attendance — last 4 weeks</p>
          <div className="mt-2 grid grid-cols-14 gap-1 sm:flex sm:gap-1.5">
            {strip.map((d) => (
              <span
                key={d}
                title={`${fmtDate(d)}${visitDays.has(d) ? " — visited" : ""}`}
                className={cx("h-6 rounded sm:h-8 sm:flex-1", visitDays.has(d) ? "bg-brand" : "bg-gray-100", d === today && "ring-2 ring-ink/30")}
              />
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Payment history</h2>
          {payments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">No payments yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {payments.map((p) => (
                <li key={p.id}>
                  <Link href={`/receipts/${p.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{fmtDate(p.date)}</p>
                      <p className="text-xs text-gray-500">{p.method} · Receipt #{p.receiptNo}</p>
                    </div>
                    <span className="font-semibold text-emerald-600 tabular">+{money(p.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Recent visits</h2>
            {visits.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">No visits recorded</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visits.slice(0, 5).map((v) => (
                  <li key={v.id} className="flex justify-between px-5 py-2.5 text-sm">
                    <span className="text-gray-900">{fmtDate(v.date)}</span>
                    <span className="text-gray-500">{fmtTime(v.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Messages sent</h2>
            {reminders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">No messages sent yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {reminders.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-green-50 text-green-600"><BellRing className="size-4" /></span>
                    <div>
                      <p className="font-medium text-gray-900">{r.kind === "comeback" ? "Come-back message" : "Fee reminder"}</p>
                      <p className="text-xs text-gray-500">{fmtDate(r.date)}</p>
                    </div>
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

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
      <Icon className="size-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="truncate font-medium text-gray-900">{value}</dd>
      </div>
    </div>
  );
}
