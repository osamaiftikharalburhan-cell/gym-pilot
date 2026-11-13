import { Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { getDb } from "@/lib/db";
import { JoinForm } from "./join-form";

export const metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-ink px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<JoinSkeleton />}>
          <Join />
        </Suspense>
      </div>
    </div>
  );
}

function JoinSkeleton() {
  return (
    <div className="space-y-4">
      <div className="mx-auto size-14 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-[520px] animate-pulse rounded-3xl bg-white/10" />
    </div>
  );
}

async function Join() {
  const db = await getDb();
  const s = db.settings;
  const plans = db.plans.map(({ id, name, price, months }) => ({ id, name, price, months }));
  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-ink">
          <Dumbbell className="size-7" strokeWidth={2.5} />
        </span>
        <h1 className="text-2xl font-bold text-white">Join {s.gymName}</h1>
        <p className="text-sm text-gray-400">Fill in your details — we&apos;ll confirm your admission at the front desk.</p>
      </div>
      <JoinForm plans={plans} admissionFee={s.admissionFee || 0} />
    </>
  );
}
