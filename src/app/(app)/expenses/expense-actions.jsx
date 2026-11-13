"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addExpense, deleteExpense } from "@/app/actions";
import { Dialog, field, label } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { btn, cx } from "@/components/ui";

export function AddExpenseButton({ categories, today }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addExpense, null);
  const toast = useToast();

  useEffect(() => {
    if (state?.ok) { setOpen(false); toast(state.message); }
  }, [state, toast]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cx(btn.base, btn.brand)}>
        <Plus className="size-4" /> Add expense
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New expense" description="Record money spent on the gym">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Amount (Rs)<input name="amount" inputMode="numeric" className={cx(field, "tabular")} placeholder="15000" required autoFocus /></label>
            <label className={label}>Date<input name="date" type="date" defaultValue={today} max={today} className={field} required /></label>
          </div>
          <label className={label}>Category
            <select name="category" className={field} defaultValue="Utilities">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={label}>Description<input name="note" className={field} placeholder="Electricity bill" /></label>
          {state && !state.ok && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={cx(btn.base, btn.outline)}>Cancel</button>
            <button disabled={pending} className={cx(btn.base, btn.brand)}>{pending ? "Saving..." : "Save expense"}</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DeleteExpenseButton({ id }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this expense?")) return;
        start(async () => { const r = await deleteExpense(id); toast(r.ok ? r.message : r.error, r.ok ? "ok" : "error"); });
      }}
      className="rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-600"
      aria-label="Delete expense"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
