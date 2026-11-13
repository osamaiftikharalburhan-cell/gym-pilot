"use client";

import { useActionState, useRef } from "react";
import { login } from "@/app/actions";
import { field, label } from "@/components/dialog";
import { btn, cx } from "@/components/ui";

const DEMO = [
  { role: "Owner", username: "owner", password: "owner123", text: "Full access: money, reports, settings" },
  { role: "Staff", username: "staff", password: "staff123", text: "Front desk: members, fees, check-in" },
];

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const form = useRef(null);

  const fill = (d) => {
    form.current.username.value = d.username;
    form.current.password.value = d.password;
  };

  return (
    <>
      <form ref={form} action={action} className="mt-8 space-y-4">
        <label className={label}>Username<input name="username" autoComplete="username" defaultValue={state?.username ?? ""} className={field} required /></label>
        <label className={label}>Password<input name="password" type="password" autoComplete="current-password" className={field} required /></label>
        {state && !state.ok && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button disabled={pending} className={cx(btn.base, btn.primary, "w-full py-2.5")}>{pending ? "Signing in..." : "Sign in"}</button>
      </form>

      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Demo accounts — click to fill</p>
        <div className="mt-3 space-y-2">
          {DEMO.map((d) => (
            <button
              key={d.username}
              type="button"
              onClick={() => fill(d)}
              className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-left transition hover:bg-gray-100"
            >
              <span>
                <span className="block text-sm font-medium text-gray-900">{d.role}</span>
                <span className="block text-xs text-gray-500">{d.text}</span>
              </span>
              <span className="font-mono text-xs text-gray-500">{d.username} / {d.password}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
