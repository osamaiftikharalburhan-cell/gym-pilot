import os from "node:os";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import QRCode from "qrcode";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Card, PageSkeleton, btn, cx } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "QR codes" };

export default function QrPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Qr />
    </Suspense>
  );
}

/** On localhost, use the PC's Wi-Fi IP so phones on the same network can open the link. */
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === "IPv4" && !ni.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(ni.address)) return ni.address;
    }
  }
  return null;
}

/**
 * The address printed in the QR codes. Posters are printed once, so this must be the
 * permanent address — never a one-off deployment link or a changing local IP.
 * 1. APP_URL (e.g. a custom domain)  2. Vercel's production domain  3. the current address
 */
function siteAddress(h) {
  const fixed = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (fixed) return { base: fixed.replace(/\/+$/, ""), lan: false };
  let host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  let lan = false;
  if (/^(localhost|127\.0\.0\.1)/.test(host)) {
    const ip = lanAddress();
    if (ip) { host = host.replace(/^(localhost|127\.0\.0\.1)/, ip); lan = true; }
  }
  return { base: `${proto}://${host}`, lan };
}

async function Qr() {
  const [, db, h] = await Promise.all([requireUser(), getDb(), headers()]);
  const { base, lan } = siteAddress(h);
  const svg = (url) => QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0e1116", light: "#ffffff" } });
  const posters = [
    { path: "/join", title: "Join the gym", tag: "New here?", text: "Scan, choose your plan and send your admission request.", svg: await svg(`${base}/join`) },
    { path: "/checkin", title: "Scan to check in", tag: "Members", text: "Scan and enter your registered WhatsApp number.", svg: await svg(`${base}/checkin`) },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="size-4" /> Attendance
        </Link>
        <PrintButton><Printer className="size-4" /> Print posters</PrintButton>
      </div>

      <div className="grid gap-6 md:grid-cols-2 print:block">
        {posters.map((p) => (
          <div key={p.path} className="print:break-after-page">
            <Card className="overflow-hidden text-center print:mx-auto print:max-w-md print:border-0 print:shadow-none">
              <div className="bg-ink px-6 py-8 text-white">
                <p className="text-sm font-medium uppercase tracking-widest text-brand">{db.settings.gymName} · {p.tag}</p>
                <h2 className="mt-2 text-3xl font-bold">{p.title}</h2>
                <p className="mt-2 text-sm text-gray-400">Open your phone camera and point it at the code</p>
              </div>
              <div className="p-8">
                <div className="mx-auto w-56 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: p.svg }} />
                <p className="mt-6 text-sm text-gray-500">{p.text}</p>
                <p className="mt-1 break-all font-mono text-xs text-gray-400">{base}{p.path}</p>
              </div>
            </Card>
            <a href={p.path} target="_blank" className={cx(btn.base, btn.outline, "mt-3 w-full print:hidden")}>
              <ExternalLink className="size-4" /> Open {p.path} page
            </a>
          </div>
        ))}
      </div>

      {lan && (
        <p className="mx-auto mt-4 max-w-lg text-center text-xs text-gray-500 print:hidden">
          These codes point to this computer, so they only work on the same Wi-Fi. Print your posters from the live website (Vercel) instead — those codes never change.
        </p>
      )}
    </>
  );
}
