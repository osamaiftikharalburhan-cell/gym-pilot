"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { addStaff, changePassword, deleteUser } from "@/app/actions";
import { Dialog, field, label } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Avatar, btn, Card, cx } from "@/components/ui";

export function UsersPanel({ users, meId }) {
  const [adding, setAdding] = useState(false);
  const [pwFor, setPwFor] = useState(null);
  const [addState, addAction, addPending] = useActionState(addStaff, null);
  const [pwState, pwAction, pwPending] = useActionState(changePassword, null);
  const [deleting, startDelete] = useTransition();
  const toast = useToast();

  useEffect(() => { if (addState?.ok) { setAdding(false); toast(addState.message); } }, [addState, toast]);
  useEffect(() => { if (pwState?.ok) { setPwFor(null); toast(pwState.message); } }, [pwState, toast]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-gray-900">Staff accounts</h2>
          <p className="text-sm text-gray-500">Staff can manage members, take fees and check people in — but can&apos;t see profit, expenses or settings.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className={cx(btn.base, btn.outline)}><Plus className="size-4" /> Add staff</button>
      </div>
      <ul className="divide-y divide-gray-100">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Avatar name={u.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{u.name} {u.id === meId && <span className="text-gray-400">(you)</span>}</p>
              <p className="font-mono text-xs text-gray-500">@{u.username}</p>
            </div>
            <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", u.role === "owner" ? "bg-brand/40 text-ink" : "bg-gray-100 text-gray-600")}>
              {u.role === "owner" ? <ShieldCheck className="size-3.5" /> : <UserRound className="size-3.5" />}
              {u.role === "owner" ? "Owner" : "Staff"}
            </span>
            <button type="button" onClick={() => setPwFor(u)} className={cx(btn.base, btn.ghost, btn.sm)}><KeyRound className="size-3.5" /> Password</button>
            {u.id !== meId && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (!confirm(`Delete ${u.name}'s account?`)) return;
                  startDelete(async () => { const r = await deleteUser(u.id); toast(r.ok ? r.message : r.error, r.ok ? "ok" : "error"); });
                }}
                className="rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${u.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={adding} onClose={() => setAdding(false)} title="New staff account" description="They will sign in with this username and password">
        <form action={addAction} className="space-y-4">
          <label className={label}>Full name<input name="name" className={field} placeholder="Front desk – Bilal" required /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Username<input name="username" className={field} placeholder="bilal" autoComplete="off" required /></label>
            <label className={label}>Password<input name="password" type="password" className={field} autoComplete="new-password" required /></label>
          </div>
          {addState && !addState.ok && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addState.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className={cx(btn.base, btn.outline)}>Cancel</button>
            <button disabled={addPending} className={cx(btn.base, btn.brand)}>{addPending ? "Creating..." : "Create account"}</button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(pwFor)} onClose={() => setPwFor(null)} title="Change password" description={pwFor ? `For ${pwFor.name} (@${pwFor.username})` : ""}>
        <form action={pwAction} className="space-y-4">
          <input type="hidden" name="userId" value={pwFor?.id ?? ""} />
          <label className={label}>New password<input name="password" type="password" className={field} autoComplete="new-password" minLength={6} required /></label>
          {pwState && !pwState.ok && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pwState.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPwFor(null)} className={cx(btn.base, btn.outline)}>Cancel</button>
            <button disabled={pwPending} className={cx(btn.base, btn.brand)}>{pwPending ? "Saving..." : "Change password"}</button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
