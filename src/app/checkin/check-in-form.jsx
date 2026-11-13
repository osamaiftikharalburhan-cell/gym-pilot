"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { publicCheckIn } from "@/app/actions";

export function CheckInForm() {
  const [state, action, pending] = useActionState(publicCheckIn, null);

  if (state?.ok) {
    const overdue = state.overdue > 0;
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-xl">
        {overdue ? (
          <AlertTriangle className="mx-auto size-14 text-red-500" />
        ) : (
          <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
        )}
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {state.already ? `You're already in, ${state.name}!` : `Welcome, ${state.name}!`}
        </h2>
        <p className="mt-1 text-sm text-gray-500">Checked in at {state.time}. Have a great workout 💪</p>
        {overdue && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-left">
            <p className="font-semibold text-red-700">Your fee is overdue by {state.overdue} day{state.overdue === 1 ? "" : "s"}</p>
            <p className="mt-1 text-sm text-red-600">Please pay at the front desk today.</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-3xl bg-white p-6 shadow-xl">
      <label className="block text-sm font-medium text-gray-700">
        WhatsApp number
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          required
          autoFocus
          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3.5 text-lg tracking-wide outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
      </label>
      {state && !state.ok && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <XCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}
      <button disabled={pending} className="mt-5 w-full rounded-xl bg-brand py-3.5 font-semibold text-ink transition hover:bg-[#b6e528] disabled:opacity-60">
        {pending ? "Checking in..." : "Check in"}
      </button>
    </form>
  );
}
