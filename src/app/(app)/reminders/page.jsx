import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, memberViews, todayIso } from "@/lib/db";
import { money } from "@/lib/format";
import { PayButton, RemindButton } from "@/components/member-actions";
import { Avatar, Card, PageHeader, PageSkeleton, StatusBadge, cx } from "@/components/ui";

export const metadata = { title: "Reminders" };

export default function RemindersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reminders />
    </Suspense>
  );
}

async function Reminders() {
  const [user, db] = await Promise.all([requireUser(), getDb()]);
  const members = memberViews(db, todayIso());
  const unpaid = members.filter((m) => m.status === "unpaid").sort((a, b) => a.daysLeft - b.daysLeft);
  const due = members.filter((m) => m.status === "due").sort((a, b) => a.daysLeft - b.daysLeft);
  const all = [...unpaid, ...due];
  const doneToday = all.filter((m) => m.remindedToday).length;
  const progress = all.length ? Math.round((doneToday / all.length) * 100) : 100;

  return (
    <>
      <PageHeader title="Reminders" subtitle="Send a WhatsApp fee reminder to everyone who hasn't paid — one click each" />

      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 bg-ink p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#1fa855]"><MessageCircle className="size-6" /></span>
            <div>
              <p className="text-lg font-semibold">{doneToday} of {all.length} reminded today</p>
              <p className="text-sm text-gray-400">&ldquo;Remind&rdquo; opens WhatsApp with the message ready — just press Send.</p>
            </div>
          </div>
          <div className="w-full sm:w-48">
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1.5 text-right text-xs text-gray-400">{progress}% done</p>
          </div>
        </div>
      </Card>

      {all.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <p className="text-lg font-semibold text-gray-900">Everyone has paid!</p>
          <p className="text-sm text-gray-500">No reminders needed right now.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Section title="Overdue fees" tone="red" members={unpaid} />
          <Section title="Due soon" tone="amber" members={due} />
        </div>
      )}

      {user.role === "owner" && (
        <p className="mt-6 text-center text-xs text-gray-400">
          You can change the message text in <Link href="/settings" className="underline hover:text-gray-600">Settings</Link>.
        </p>
      )}
    </>
  );
}

function Section({ title, tone, members }) {
  if (!members.length) return null;
  return (
    <Card>
      <h2 className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">
        <span className={cx("size-2 rounded-full", tone === "red" ? "bg-red-500" : "bg-amber-400")} />
        {title}
        <span className="ml-1 rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-600">{members.length}</span>
      </h2>
      <ul className="divide-y divide-gray-100">
        {members.map((m) => (
          <li key={m.id} className={cx("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center", m.remindedToday && "opacity-60")}>
            <Link href={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={m.name} alert={m.status === "unpaid"} />
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium text-gray-900">{m.name} <StatusBadge status={m.status} /></p>
                <p className={cx("text-xs", m.status === "unpaid" ? "font-medium text-red-600" : "text-amber-700")}>
                  {m.dueLabel} · {money(m.planPrice)}
                  {m.lastReminderLabel && <span className="font-normal text-gray-400"> · Last reminded {m.lastReminderLabel}</span>}
                </p>
              </div>
            </Link>
            <div className="flex gap-2">
              <RemindButton memberId={m.id} phone={m.phone} text={m.reminderText} remindedToday={m.remindedToday} small />
              <PayButton memberId={m.id} name={m.name} amount={m.planPrice} small />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
