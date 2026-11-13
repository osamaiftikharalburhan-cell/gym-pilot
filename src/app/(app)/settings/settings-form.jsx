"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { resetDemoData, saveSettings } from "@/app/actions";
import { field, label } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { btn, Card, cx } from "@/components/ui";
import { fillTemplate } from "@/lib/format";

function Bubble({ text }) {
  return (
    <div className="rounded-2xl bg-[#efeae2] p-3">
      <p className="whitespace-pre-wrap rounded-xl rounded-tr-none bg-[#dcf8c6] p-3 text-sm text-gray-800 shadow-sm">{text}</p>
    </div>
  );
}

export function SettingsForm({ settings, plans }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const [resetting, startReset] = useTransition();
  const [tpl, setTpl] = useState(settings.reminderTemplate);
  const [comeback, setComeback] = useState(settings.comebackTemplate);
  const toast = useToast();

  useEffect(() => {
    if (state) toast(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
  }, [state, toast]);

  const sample = { name: "Ali", gym: settings.gymName, plan: plans[0]?.name ?? "Gym", amount: "Rs 3,000", dueDate: "10 Dec 2026", days: "9" };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form action={action} className="space-y-6 lg:col-span-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold text-gray-900">Gym details</h2>
          <p className="text-sm text-gray-500">Shown on receipts and WhatsApp messages</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={label}>Gym name<input name="gymName" defaultValue={settings.gymName} className={field} /></label>
            <label className={label}>Gym phone<input name="phone" defaultValue={settings.phone} className={field} /></label>
            <label className={cx(label, "sm:col-span-2")}>Address<input name="address" defaultValue={settings.address} className={field} /></label>
            <label className={label}>Country code<input name="countryCode" defaultValue={settings.countryCode} className={field} /></label>
            <label className={label}>
              Admission fee (one-time)
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-gray-400">Rs</span>
                <input name="admissionFee" defaultValue={settings.admissionFee ?? 0} inputMode="numeric" className={cx(field, "pl-9 tabular")} />
              </div>
            </label>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold text-gray-900">WhatsApp AI bot</h2>
          <p className="text-sm text-gray-500">The bot answers people using this information plus your plans and prices.</p>
          <label className={cx(label, "mt-4")}>
            Gym information for the bot
            <textarea name="gymInfo" rows={5} defaultValue={settings.gymInfo} className={field} placeholder="Timings, ladies time, facilities, rules..." />
          </label>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" name="botEnabled" defaultChecked={settings.botEnabled} className="size-4 accent-ink" />
              Reply to WhatsApp messages automatically
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" name="autoReminders" defaultChecked={settings.autoReminders} className="size-4 accent-ink" />
              Send fee reminders automatically every day (to unpaid members, at most every 3 days)
            </label>
            <label className={cx(label, "max-w-xs")}>
              Send reminders at
              <select name="reminderHour" defaultValue={settings.reminderHour ?? 11} className={field}>
                {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>{h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold text-gray-900">Fee plans</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {plans.map((p) => (
              <label key={p.id} className={label}>
                {p.name} <span className="font-normal text-gray-400">({p.months === 1 ? "monthly" : `every ${p.months} months`})</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-gray-400">Rs</span>
                  <input name={`plan_${p.id}`} defaultValue={p.price} inputMode="numeric" className={cx(field, "pl-9 tabular")} />
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold text-gray-900">WhatsApp messages</h2>
          <label className={cx(label, "mt-4")}>
            Fee reminder
            <textarea name="reminderTemplate" rows={4} value={tpl} onChange={(e) => setTpl(e.target.value)} className={field} />
          </label>
          <p className="mt-2 text-xs text-gray-500">
            Auto-filled: {["{name}", "{gym}", "{plan}", "{amount}", "{dueDate}"].map((t) => (
              <code key={t} className="mr-1 rounded bg-gray-100 px-1 py-0.5 text-gray-700">{t}</code>
            ))}
          </p>
          <label className={cx(label, "mt-5")}>
            Come-back message (members who stopped visiting)
            <textarea name="comebackTemplate" rows={3} value={comeback} onChange={(e) => setComeback(e.target.value)} className={field} />
          </label>
          <p className="mt-2 text-xs text-gray-500">
            Auto-filled: {["{name}", "{gym}", "{days}"].map((t) => (
              <code key={t} className="mr-1 rounded bg-gray-100 px-1 py-0.5 text-gray-700">{t}</code>
            ))}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Show &ldquo;Due soon&rdquo; this many days before
              <input name="dueSoonDays" type="number" min={0} max={15} defaultValue={settings.dueSoonDays} className={field} />
            </label>
            <label className={label}>
              Flag members not seen for (days)
              <input name="inactiveDays" type="number" min={2} max={60} defaultValue={settings.inactiveDays} className={field} />
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <button disabled={pending} className={cx(btn.base, btn.brand, "px-6")}>{pending ? "Saving..." : "Save settings"}</button>
        </div>
      </form>

      <div className="space-y-6">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Fee reminder preview</p>
          <div className="mt-3"><Bubble text={fillTemplate(tpl, sample)} /></div>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-400">Come-back preview</p>
          <div className="mt-3"><Bubble text={fillTemplate(comeback, sample)} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">Demo data</h2>
          <p className="mt-1 text-sm text-gray-500">Restore fresh sample data before showing the app to a gym owner.</p>
          <button
            type="button"
            disabled={resetting}
            onClick={() => {
              if (!confirm("Erase all data and load fresh sample data?")) return;
              startReset(async () => { const r = await resetDemoData(); toast(r.ok ? r.message : r.error, r.ok ? "ok" : "error"); });
            }}
            className={cx(btn.base, btn.danger, "mt-4 w-full")}
          >
            <RotateCcw className="size-4" /> {resetting ? "Resetting..." : "Reset demo data"}
          </button>
        </Card>
      </div>
    </div>
  );
}
