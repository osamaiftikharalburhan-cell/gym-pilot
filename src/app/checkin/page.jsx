import { Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { getDb } from "@/lib/db";
import { CheckInForm } from "./check-in-form";

export const metadata = { title: "Check in" };

export default function CheckInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-ink">
            <Dumbbell className="size-7" strokeWidth={2.5} />
          </span>
          <Suspense fallback={<p className="h-8 text-2xl font-bold text-white">Welcome</p>}>
            <GymName />
          </Suspense>
          <p className="text-sm text-gray-400">Enter your WhatsApp number to check in</p>
        </div>
        <CheckInForm />
      </div>
    </div>
  );
}

async function GymName() {
  const db = await getDb();
  return <h1 className="text-2xl font-bold text-white">{db.settings.gymName}</h1>;
}
