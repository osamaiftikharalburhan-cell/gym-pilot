import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getDb, memberViews, todayIso } from "@/lib/db";
import { addMonths } from "@/lib/format";
import { MemberFormButton } from "@/components/member-actions";
import { MembersTable } from "@/components/members-table";
import { Card, PageHeader, Skeleton } from "@/components/ui";

export const metadata = { title: "Members" };

const STATUSES = ["paid", "due", "unpaid", "frozen", "inactive"];

export default function MembersPage({ searchParams }) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Members" subtitle="Loading..." />
          <Skeleton className="h-[480px]" />
        </>
      }
    >
      <Members searchParams={searchParams} />
    </Suspense>
  );
}

async function Members({ searchParams }) {
  const [, db, sp] = await Promise.all([requireUser(), getDb(), searchParams]);
  const today = todayIso();
  const members = memberViews(db, today);
  const activeCount = members.filter((m) => m.status !== "inactive").length;
  const unpaid = members.filter((m) => m.status === "unpaid").length;
  const status = STATUSES.includes(sp.status) ? sp.status : "all";

  return (
    <>
      <PageHeader
        title="Members"
        subtitle={`${activeCount} members · ${unpaid} with unpaid fees`}
        action={<MemberFormButton plans={db.plans} defaultDueDate={addMonths(today, 1)} />}
      />
      <Card className="overflow-hidden">
        <MembersTable key={status} members={members} initialFilter={status} />
      </Card>
    </>
  );
}
