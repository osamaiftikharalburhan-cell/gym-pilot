import { getCurrentUser } from "@/lib/auth";
import { getDb, monthTotals } from "@/lib/db";

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/report?month=YYYY-MM  -> CSV of income and expenses (owner only)
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return new Response("Not allowed", { status: 403 });

  const month = request.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return new Response("Invalid month", { status: 400 });

  const db = await getDb();
  const names = new Map(db.members.map((m) => [m.id, m.name]));
  const rows = [["Date", "Type", "Category / Method", "Description", "Receipt #", "Amount (Rs)"]];

  for (const p of db.payments.filter((x) => x.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([p.date, "Income", p.method, `Fee — ${names.get(p.memberId) ?? "Deleted member"}`, p.receiptNo, p.amount]);
  }
  for (const e of db.expenses.filter((x) => x.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([e.date, "Expense", e.category, e.note, "", -e.amount]);
  }
  const t = monthTotals(db, month);
  rows.push([], ["", "Total income", "", "", "", t.income], ["", "Total expenses", "", "", "", -t.expenses], ["", "Profit", "", "", "", t.profit]);

  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${db.settings.gymName.replace(/\W+/g, "-")}-report-${month}.csv"`,
    },
  });
}
