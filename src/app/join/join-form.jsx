"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { submitAdmission } from "@/app/actions";
import { money } from "@/lib/format";
import { cx } from "@/components/ui";

const input =
  "mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-ink focus:ring-2 focus:ring-ink/10";
const TIMINGS = ["Morning", "Evening", "Ladies time", "Flexible"];

export function JoinForm({ plans, admissionFee }) {
  const [state, action, pending] = useActionState(submitAdmission, null);
  const [planId, setPlanId] = useState(plans[0]?.id);
  const [gender, setGender] = useState("Male");
  const [timing, setTiming] = useState("Evening");
  const plan = plans.find((p) => p.id === planId);

  if (state?.ok) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-xl">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Thanks, {state.firstName}!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your admission request has been sent to {state.gymName}. Please visit the front desk to complete it.
        </p>
        <div className="mt-5 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Amount to pay</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 tabular">{money(state.total)}</p>
          {admissionFee > 0 && <p className="mt-1 text-xs text-gray-500">Includes {money(admissionFee)} one-time admission fee</p>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-3xl bg-white p-6 shadow-xl">
      <label className="block text-sm font-medium text-gray-700">
        Full name
        <input name="name" autoComplete="name" required className={input} placeholder="Your name" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        WhatsApp number
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={input} placeholder="0300 1234567" />
      </label>

      <div>
        <span className="block text-sm font-medium text-gray-700">Gender</span>
        <input type="hidden" name="gender" value={gender} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          {["Male", "Female"].map((g) => (
            <button key={g} type="button" onClick={() => setGender(g)} className={cx("rounded-xl border py-2.5 text-sm font-medium", gender === g ? "border-ink bg-ink text-white" : "border-gray-200 text-gray-700")}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Choose a plan</span>
        <input type="hidden" name="planId" value={planId} />
        <div className="mt-2 space-y-2">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={cx(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                planId === p.id ? "border-ink bg-ink text-white" : "border-gray-200 text-gray-800 hover:bg-gray-50",
              )}
            >
              <span className="font-medium">{p.name}</span>
              <span className={cx("text-sm tabular", planId === p.id ? "text-brand" : "text-gray-500")}>
                {money(p.price)} / {p.months === 1 ? "month" : `${p.months} months`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Preferred time</span>
        <input type="hidden" name="timing" value={timing} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TIMINGS.map((t) => (
            <button key={t} type="button" onClick={() => setTiming(t)} className={cx("rounded-xl border py-2.5 text-sm font-medium", timing === t ? "border-ink bg-ink text-white" : "border-gray-200 text-gray-700")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Fitness goal <span className="font-normal text-gray-400">(optional)</span>
        <input name="goal" className={input} placeholder="Weight loss, muscle gain..." />
      </label>

      {plan && (
        <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
          <span className="text-gray-600">Total to pay{admissionFee > 0 && " (incl. admission)"}</span>
          <span className="text-lg font-bold text-gray-900 tabular">{money(plan.price + admissionFee)}</span>
        </div>
      )}

      {state && !state.ok && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <XCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full rounded-xl bg-brand py-3.5 font-semibold text-ink transition hover:bg-[#b6e528] disabled:opacity-60">
        {pending ? "Sending..." : "Send admission request"}
      </button>
    </form>
  );
}
