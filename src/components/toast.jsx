"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const Ctx = createContext(() => {});

/** toast(text, kind) — kind: "ok" | "error" | "warn" (true/false also accepted). */
export function useToast() {
  return useContext(Ctx);
}

let nextId = 1;

export function Toaster({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((text, kind = "ok") => {
    const k = kind === true ? "ok" : kind === false ? "error" : kind;
    const id = nextId++;
    setToasts((t) => [...t, { id, text, kind: k }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), k === "warn" ? 5000 : 3200);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg " +
              (t.kind === "warn" ? "bg-red-600 text-white" : "bg-ink text-white")
            }
          >
            {t.kind === "ok" && <CheckCircle2 className="size-4 shrink-0 text-brand" />}
            {t.kind === "error" && <XCircle className="size-4 shrink-0 text-red-400" />}
            {t.kind === "warn" && <AlertTriangle className="size-4 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
