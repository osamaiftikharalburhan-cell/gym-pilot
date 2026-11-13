"use client";

import { btn, cx } from "./ui";

export function PrintButton({ children, className }) {
  return (
    <button type="button" onClick={() => window.print()} className={cx(btn.base, btn.primary, className)}>
      {children}
    </button>
  );
}
