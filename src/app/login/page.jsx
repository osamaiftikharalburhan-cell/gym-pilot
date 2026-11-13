import { Dumbbell } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-ink">
            <Dumbbell className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-xl font-bold">Gym<span className="text-brand">Pilot</span></span>
        </div>
        <div className="mt-auto max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Run your gym, not spreadsheets.</h1>
          <p className="mt-4 text-gray-400">
            Track fees, send WhatsApp reminders, check members in with a QR code, and see your real profit — all in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-gray-300">
            {["Know who paid and who didn't — instantly", "One-click WhatsApp reminders & receipts", "QR check-in with unpaid-fee alerts", "Income, expenses and profit reports"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-brand" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-ink"><Dumbbell className="size-5" strokeWidth={2.5} /></span>
            <span className="text-xl font-bold text-ink">Gym<span className="text-brand-dark">Pilot</span></span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
          <p className="mt-1 text-sm text-gray-500">Welcome back! Please sign in to your account.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
