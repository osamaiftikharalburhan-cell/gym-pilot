"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bot, Database, Smartphone } from "lucide-react";
import { Card, cx } from "@/components/ui";
import { displayPhone } from "@/lib/format";

const STALE_MS = 3 * 60_000;

export function BotCard({ status, now, storage }) {
  const router = useRouter();
  const alive = status.lastSeen && now - Date.parse(status.lastSeen) < STALE_MS;
  const state = !alive ? "offline" : status.state;

  // While waiting for a scan, refresh every few seconds to pick up the new status.
  useEffect(() => {
    if (state === "offline" || state === "connected") return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [state, router]);

  const badge = {
    connected: ["bg-emerald-50 text-emerald-700", "Connected"],
    qr: ["bg-amber-50 text-amber-700", "Scan the QR code"],
    starting: ["bg-sky-50 text-sky-700", "Starting..."],
    offline: ["bg-gray-100 text-gray-600", "Not running"],
  }[state] ?? ["bg-gray-100 text-gray-600", state];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#1fa855] text-white"><Bot className="size-5" /></span>
            <div>
              <h2 className="font-semibold text-gray-900">WhatsApp AI bot</h2>
              <p className="text-sm text-gray-500">Answers questions and sends fee reminders automatically</p>
            </div>
            <span className={cx("rounded-full px-2.5 py-1 text-xs font-medium", badge[0])}>{badge[1]}</span>
          </div>

          {state === "connected" && (
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <Smartphone className="size-4 text-gray-400" /> Linked to {status.me ? displayPhone(status.me) : "your WhatsApp"}
            </p>
          )}
          {state === "offline" && (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900">Start the bot on the gym computer:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Open a terminal in the project folder</li>
                <li>Run <code className="rounded bg-white px-1.5 py-0.5 text-xs">npm run bot</code></li>
                <li>A QR code will appear here — scan it with the gym&apos;s WhatsApp</li>
              </ol>
              <p className="mt-2 text-xs text-gray-500">The bot needs a computer that stays on. It can&apos;t run on Vercel.</p>
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Database className="size-3.5" /> Data storage: {storage === "upstash" ? "Upstash Redis (online)" : "Local file (data/db.json)"}
          </p>
        </div>

        {state === "qr" && status.qr && (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.qr} alt="WhatsApp QR code" className="mx-auto size-52 rounded-xl border border-gray-200 bg-white p-2" />
            <p className="mt-2 max-w-52 text-xs text-gray-500">WhatsApp → Linked devices → Link a device</p>
          </div>
        )}
      </div>
    </Card>
  );
}
