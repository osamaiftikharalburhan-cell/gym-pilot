"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Check, LogIn, MessageCircle, Pause, Pencil, Play, Plus, Trash2, UserMinus, UserPlus, Wallet,
} from "lucide-react";
import {
  checkInMember, deleteMember, freezeMember, logReminder, markInactive, reactivateMember, recordPayment,
  saveMember, unfreezeMember,
} from "@/app/actions";
import { money, whatsappLink } from "@/lib/format";
import { Dialog, field, label } from "./dialog";
import { useShowReceipt } from "./receipt-dialog";
import { useToast } from "./toast";
import { btn, cx } from "./ui";

// ---------------- WhatsApp reminder ----------------
export function RemindButton({ memberId, phone, text, remindedToday, small, kind = "fee", labelText = "Remind" }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      title="Send a WhatsApp message"
      onClick={() => {
        window.open(whatsappLink(phone, text), "_blank", "noopener");
        start(async () => {
          const r = await logReminder(memberId, kind);
          if (r.ok) toast("WhatsApp opened — just press Send");
          else toast(r.error, "error");
        });
      }}
      className={cx(btn.base, remindedToday ? btn.outline : btn.whatsapp, small && btn.sm)}
    >
      {remindedToday ? <Check className="size-3.5 text-emerald-600" /> : <MessageCircle className="size-3.5" />}
      {remindedToday ? "Sent" : labelText}
    </button>
  );
}

// ---------------- Record payment + receipt ----------------
const METHODS = ["Cash", "JazzCash", "EasyPaisa", "Bank"];

export function PayButton({ memberId, name, amount, small, full }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [method, setMethod] = useState("Cash");
  const [pending, start] = useTransition();
  const toast = useToast();
  const showReceipt = useShowReceipt();

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => { setValue(String(amount)); setMethod("Cash"); setOpen(true); }}
        className={cx(btn.base, btn.primary, small && btn.sm, full && "w-full")}
      >
        <Wallet className="size-3.5" /> Fee received
      </button>
      <Dialog open={open} onClose={close} title="Fee received" description={`Record a payment for ${name}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const paid = Number(value);
              start(async () => {
                const r = await recordPayment(memberId, paid, method);
                if (r.ok) {
                  setOpen(false);
                  showReceipt({ ...r, name, amount: paid, method });
                } else toast(r.error, "error");
              });
            }}
            className="space-y-4"
          >
            <label className={label}>
              Amount (Rs)
              <input className={cx(field, "text-lg font-semibold tabular")} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} autoFocus />
            </label>
            <div>
              <span className={label}>Payment method</span>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cx("rounded-lg border px-2 py-2 text-xs font-medium transition", method === m ? "border-ink bg-ink text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50")}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">The next due date moves forward automatically based on the plan.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className={cx(btn.base, btn.outline)}>Cancel</button>
              <button disabled={pending || !value} className={cx(btn.base, btn.brand)}>
                {pending ? "Saving..." : `Save ${value ? money(Number(value)) : ""}`}
              </button>
            </div>
          </form>
      </Dialog>
    </>
  );
}

// ---------------- Add / edit member ----------------
export function MemberFormButton({ plans, initial, defaultDueDate }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveMember, null);
  const toast = useToast();
  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (state?.ok) { setOpen(false); toast(state.message); }
  }, [state, toast]);

  const v = initial ?? { name: "", phone: "", gender: "Male", planId: plans[0]?.id ?? "", dueDate: defaultDueDate };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cx(btn.base, editing ? btn.outline : btn.brand)}>
        {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {editing ? "Edit" : "Add member"}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit member" : "New member"} description="Enter the member's details">
        <form action={action} className="space-y-4">
          {v.id && <input type="hidden" name="id" value={v.id} />}
          <label className={label}>Full name<input name="name" defaultValue={v.name} className={field} placeholder="Ali Raza" required /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>WhatsApp number<input name="phone" defaultValue={v.phone} className={field} placeholder="0300 1234567" required /></label>
            <label className={label}>Gender
              <select name="gender" defaultValue={v.gender} className={field}><option>Male</option><option>Female</option></select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Plan
              <select name="planId" defaultValue={v.planId} className={field}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
              </select>
            </label>
            <label className={label}>Next fee due<input type="date" name="dueDate" defaultValue={v.dueDate} className={field} required /></label>
          </div>
          <label className={label}>Notes <span className="font-normal text-gray-400">(optional)</span><input name="notes" defaultValue={v.notes} className={field} placeholder="Morning batch" /></label>
          {state && !state.ok && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={cx(btn.base, btn.outline)}>Cancel</button>
            <button disabled={pending} className={cx(btn.base, btn.brand)}>{pending ? "Saving..." : "Save member"}</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DeleteMemberButton({ memberId, name }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => { if (confirm(`Delete ${name}? Their payment and attendance history will also be deleted.`)) start(() => deleteMember(memberId)); }}
      className={cx(btn.base, btn.danger)}
    >
      <Trash2 className="size-4" /> {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

// ---------------- Freeze / left / reactivate ----------------
export function MembershipButtons({ memberId, name, status }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const run = (fn, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      const r = await fn(memberId);
      toast(r.ok ? r.message : r.error, r.ok ? "ok" : "error");
    });
  };

  if (status === "inactive") {
    return (
      <button type="button" disabled={pending} onClick={() => run(reactivateMember)} className={cx(btn.base, btn.outline)}>
        <UserPlus className="size-4" /> Rejoin
      </button>
    );
  }
  return (
    <>
      {status === "frozen" ? (
        <button type="button" disabled={pending} onClick={() => run(unfreezeMember)} className={cx(btn.base, btn.outline)}>
          <Play className="size-4" /> Unfreeze
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(freezeMember, `Freeze ${name}'s membership? Fees will pause until you unfreeze.`)}
          className={cx(btn.base, btn.outline)}
        >
          <Pause className="size-4" /> Freeze
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(markInactive, `Mark ${name} as left the gym?`)}
        className={cx(btn.base, btn.outline)}
      >
        <UserMinus className="size-4" /> Mark as left
      </button>
    </>
  );
}

// ---------------- Check in ----------------
export function CheckInButton({ memberId, done, small }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        start(async () => {
          const r = await checkInMember(memberId);
          if (!r.ok) toast(r.error, "error");
          else toast(r.message, r.warning ? "warn" : "ok");
        })
      }
      className={cx(btn.base, done ? btn.outline : btn.primary, small && btn.sm)}
    >
      {done ? <Check className="size-3.5 text-emerald-600" /> : <LogIn className="size-3.5" />}
      {done ? "In today" : pending ? "..." : "Check in"}
    </button>
  );
}
