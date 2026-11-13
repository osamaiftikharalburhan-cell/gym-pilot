"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, MessageCircle, Printer } from "lucide-react";
import { money, whatsappLink } from "@/lib/format";
import { Dialog } from "./dialog";
import { btn, cx } from "./ui";

const Ctx = createContext(() => {});

/** showReceipt({ paymentId, receiptNo, receiptText, phone, name, amount, method }) */
export function useShowReceipt() {
  return useContext(Ctx);
}

// Lives in the app layout so the receipt stays open even when the paid member
// disappears from the list they were clicked in (e.g. the "Unpaid" filter).
export function ReceiptProvider({ children }) {
  const [receipt, setReceipt] = useState(null);
  const show = useCallback((r) => setReceipt(r), []);
  const close = () => setReceipt(null);

  return (
    <Ctx.Provider value={show}>
      {children}
      <Dialog open={Boolean(receipt)} onClose={close} title="Payment saved" description={receipt ? `Receipt #${receipt.receiptNo}` : ""}>
        {receipt && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="text-2xl font-semibold text-emerald-700 tabular">{money(receipt.amount)}</p>
              <p className="text-sm text-emerald-800">received from {receipt.name} via {receipt.method}</p>
            </div>
            <p className="whitespace-pre-wrap rounded-xl rounded-tr-none bg-[#dcf8c6] p-3 text-xs text-gray-800">{receipt.receiptText}</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={whatsappLink(receipt.phone, receipt.receiptText)} target="_blank" rel="noopener" className={cx(btn.base, btn.whatsapp, "py-2.5")}>
                <MessageCircle className="size-4" /> Send receipt
              </a>
              <Link href={`/receipts/${receipt.paymentId}`} onClick={close} className={cx(btn.base, btn.outline)}>
                <Printer className="size-4" /> Print receipt
              </Link>
            </div>
            <button type="button" onClick={close} className={cx(btn.base, btn.ghost, "w-full")}>Done</button>
          </div>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}
