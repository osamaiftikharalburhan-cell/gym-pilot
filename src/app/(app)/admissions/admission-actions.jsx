"use client";

import { useState, useTransition } from "react";
import { Check, MessageCircle, X } from "lucide-react";
import { approveAdmission, rejectAdmission } from "@/app/actions";
import { Dialog, field, label } from "@/components/dialog";
import { useShowReceipt } from "@/components/receipt-dialog";
import { useToast } from "@/components/toast";
import { btn, cx } from "@/components/ui";
import { money, whatsappLink } from "@/lib/format";

const METHODS = ["Cash", "JazzCash", "EasyPaisa", "Bank"];

export function AdmissionActions({ id, name, phone, total, breakdown, welcomeText }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(total));
  const [method, setMethod] = useState("Cash");
  const [pending, start] = useTransition();
  const toast = useToast();
  const showReceipt = useShowReceipt();

  return (
    <div className="flex flex-wrap gap-2">
      <a href={whatsappLink(phone, welcomeText)} target="_blank" rel="noopener" className={cx(btn.base, btn.whatsapp, btn.sm)} title="Send a welcome message">
        <MessageCircle className="size-3.5" /> Message
      </a>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove ${name}'s request?`)) return;
          start(async () => { const r = await rejectAdmission(id); toast(r.ok ? r.message : r.error, r.ok ? "ok" : "error"); });
        }}
        className={cx(btn.base, btn.outline, btn.sm)}
      >
        <X className="size-3.5" /> Remove
      </button>
      <button type="button" onClick={() => { setValue(String(total)); setOpen(true); }} className={cx(btn.base, btn.primary, btn.sm)}>
        <Check className="size-3.5" /> Approve & take fee
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Approve admission" description={`${name} · ${breakdown}`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const paid = Number(value);
            start(async () => {
              const r = await approveAdmission(id, paid, method);
              if (!r.ok) return toast(r.error, "error");
              setOpen(false);
              toast(r.message);
              showReceipt({ ...r, name, amount: paid, method });
            });
          }}
        >
          <label className={label}>
            Amount received (Rs)
            <input className={cx(field, "text-lg font-semibold tabular")} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} autoFocus />
          </label>
          <div>
            <span className={label}>Payment method</span>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={cx("rounded-lg border px-2 py-2 text-xs font-medium transition", method === m ? "border-ink bg-ink text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50")}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">They become an active member today, and their next fee is due one plan period from now.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={cx(btn.base, btn.outline)}>Cancel</button>
            <button disabled={pending || !value} className={cx(btn.base, btn.brand)}>{pending ? "Saving..." : `Approve · ${value ? money(Number(value)) : ""}`}</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
