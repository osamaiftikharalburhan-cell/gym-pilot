"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { assertUser } from "@/lib/auth";
import {
  buildReceiptText, EXPENSE_CATEGORIES, getDb, PAYMENT_METHODS, resetDb, todayIso, updateDb,
} from "@/lib/db";
import { addDays, addMonths, diffDays, normalizePhone, plural } from "@/lib/format";
import { zonedTime } from "@/lib/time";
import {
  createSessionToken, hashPassword, SESSION_COOKIE, SESSION_DAYS, verifyPassword,
} from "@/lib/session";

const str = (fd, key) => String(fd.get(key) ?? "").trim();
const fail = (e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

// ---------------- auth ----------------
export async function login(_prev, fd) {
  const username = str(fd, "username").toLowerCase();
  const password = str(fd, "password");
  const db = await getDb();
  const user = db.users.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.password)) {
    return { ok: false, error: "Wrong username or password.", username };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionToken({ uid: user.id, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------------- payments ----------------
export async function recordPayment(memberId, amount, method) {
  try {
    await assertUser();
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Please enter a valid amount.");
    if (!PAYMENT_METHODS.includes(method)) throw new Error("Invalid payment method.");
    const today = todayIso();
    const result = await updateDb((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      const plan = db.plans.find((p) => p.id === m.planId);
      // Continue the billing cycle; if very late, restart from today.
      const base = diffDays(today, m.dueDate) > 31 ? today : m.dueDate;
      m.dueDate = addMonths(base, plan?.months ?? 1);
      if (m.status !== "active") { m.status = "active"; delete m.frozenAt; delete m.leftAt; }
      const payment = {
        id: crypto.randomUUID(), memberId, amount, date: today, method, receiptNo: db.meta.nextReceipt++,
      };
      db.payments.unshift(payment);
      return { payment, name: m.name, phone: m.phone, receiptText: buildReceiptText(db, payment) };
    });
    refresh();
    return {
      ok: true,
      message: `Payment saved for ${result.name}`,
      paymentId: result.payment.id,
      receiptNo: result.payment.receiptNo,
      receiptText: result.receiptText,
      phone: result.phone,
    };
  } catch (e) {
    return fail(e);
  }
}

// ---------------- reminders ----------------
export async function logReminder(memberId, kind = "fee") {
  try {
    await assertUser();
    await updateDb((db) => {
      db.reminders.push({ id: crypto.randomUUID(), memberId, kind, date: todayIso(), at: new Date().toISOString() });
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------- members ----------------
export async function saveMember(_prev, fd) {
  const id = str(fd, "id");
  try {
    await assertUser();
    const name = str(fd, "name");
    const planId = str(fd, "planId");
    const gender = str(fd, "gender") === "Female" ? "Female" : "Male";
    const dueDate = str(fd, "dueDate");
    const notes = str(fd, "notes");
    if (name.length < 2) throw new Error("Please enter the member's name.");
    await updateDb((db) => {
      const phone = normalizePhone(str(fd, "phone"), db.settings.countryCode);
      if (phone.length < 10) throw new Error("Please enter a valid phone number.");
      if (!db.plans.some((p) => p.id === planId)) throw new Error("Please choose a plan.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("Please choose the next due date.");
      const dupe = db.members.find((m) => m.phone === phone && m.id !== id);
      if (dupe) throw new Error(`This number already belongs to ${dupe.name}.`);
      if (id) {
        const m = db.members.find((x) => x.id === id);
        if (!m) throw new Error("Member not found.");
        Object.assign(m, { name, phone, planId, gender, dueDate });
        if (notes) m.notes = notes; else delete m.notes;
      } else {
        db.members.push({
          id: "m" + crypto.randomUUID().slice(0, 8), name, phone, planId, gender, dueDate,
          joinDate: todayIso(), status: "active", ...(notes && { notes }),
        });
      }
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, message: id ? "Member updated" : "New member added" };
}

export async function deleteMember(memberId) {
  await assertUser("owner");
  await updateDb((db) => {
    db.members = db.members.filter((m) => m.id !== memberId);
    db.payments = db.payments.filter((p) => p.memberId !== memberId);
    db.reminders = db.reminders.filter((r) => r.memberId !== memberId);
    db.attendance = db.attendance.filter((a) => a.memberId !== memberId);
  });
  redirect("/members");
}

async function changeMember(memberId, fn) {
  try {
    await assertUser();
    const message = await updateDb((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      return fn(m, todayIso());
    });
    refresh();
    return { ok: true, message };
  } catch (e) {
    return fail(e);
  }
}

export async function freezeMember(memberId) {
  return changeMember(memberId, (m, today) => {
    if (m.status !== "active") throw new Error("Only active members can be frozen.");
    m.status = "frozen";
    m.frozenAt = today;
    return `${m.name}'s membership is frozen. Fees won't run while frozen.`;
  });
}

export async function unfreezeMember(memberId) {
  return changeMember(memberId, (m, today) => {
    if (m.status !== "frozen") throw new Error("Member is not frozen.");
    const days = Math.max(0, diffDays(today, m.frozenAt ?? today));
    m.dueDate = addDays(m.dueDate, days);
    m.status = "active";
    delete m.frozenAt;
    return `Welcome back! Due date moved forward by ${plural(days, "day")}.`;
  });
}

export async function markInactive(memberId) {
  return changeMember(memberId, (m, today) => {
    m.status = "inactive";
    m.leftAt = today;
    delete m.frozenAt;
    return `${m.name} marked as left. They won't appear in unpaid lists.`;
  });
}

export async function reactivateMember(memberId) {
  return changeMember(memberId, (m, today) => {
    m.status = "active";
    m.dueDate = today;
    delete m.leftAt;
    delete m.frozenAt;
    return `${m.name} is active again. Their fee is due today.`;
  });
}

// ---------------- attendance ----------------
function doCheckIn(db, m) {
  const today = todayIso();
  const already = db.attendance.some((a) => a.memberId === m.id && a.date === today);
  if (!already) db.attendance.push({ id: crypto.randomUUID(), memberId: m.id, date: today, at: new Date().toISOString() });
  const overdue = m.status === "active" ? -diffDays(m.dueDate, today) : 0;
  return { already, overdue };
}

/** Staff check-in from the Attendance page. */
export async function checkInMember(memberId) {
  try {
    await assertUser();
    const r = await updateDb((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found.");
      if (m.status === "inactive") throw new Error(`${m.name} is not an active member.`);
      return { ...doCheckIn(db, m), name: m.name, frozen: m.status === "frozen" };
    });
    refresh();
    if (r.overdue > 0) return { ok: true, warning: true, message: `${r.name} checked in — fee overdue by ${plural(r.overdue, "day")}!` };
    return { ok: true, message: r.already ? `${r.name} already checked in today` : `${r.name} checked in` };
  } catch (e) {
    return fail(e);
  }
}

/** Public self check-in (member scans the QR and types their number). */
export async function publicCheckIn(_prev, fd) {
  try {
    const r = await updateDb((db) => {
      const phone = normalizePhone(str(fd, "phone"), db.settings.countryCode);
      const m = db.members.find((x) => x.phone === phone);
      if (!m || phone.length < 10) throw new Error("We couldn't find this number. Please ask the front desk.");
      if (m.status === "inactive") throw new Error("Your membership is not active. Please visit the front desk.");
      if (m.status === "frozen") throw new Error("Your membership is frozen. Please visit the front desk to resume it.");
      return { ...doCheckIn(db, m), name: m.name.split(" ")[0] };
    });
    refresh();
    return {
      ok: true,
      name: r.name,
      already: r.already,
      overdue: r.overdue,
      time: zonedTime(new Date().toISOString()),
    };
  } catch (e) {
    return fail(e);
  }
}

// ---------------- admissions (Join QR) ----------------
/** Public: someone scanned the Join QR and filled the form. */
export async function submitAdmission(_prev, fd) {
  try {
    const name = str(fd, "name");
    const planId = str(fd, "planId");
    const gender = str(fd, "gender") === "Female" ? "Female" : "Male";
    const timing = ["Morning", "Evening", "Ladies time", "Flexible"].includes(str(fd, "timing")) ? str(fd, "timing") : "Flexible";
    const goal = str(fd, "goal").slice(0, 80);
    if (name.length < 2) throw new Error("Please enter your full name.");
    const result = await updateDb((db) => {
      const phone = normalizePhone(str(fd, "phone"), db.settings.countryCode);
      if (phone.length < 10) throw new Error("Please enter a valid WhatsApp number.");
      if (!db.plans.some((p) => p.id === planId)) throw new Error("Please choose a plan.");
      const member = db.members.find((m) => m.phone === phone && m.status !== "inactive");
      if (member) throw new Error("You're already a member! Use the check-in QR instead.");
      db.admissions ??= [];
      const existing = db.admissions.find((a) => a.phone === phone && a.status === "pending");
      const data = { name, phone, gender, planId, timing, goal, at: new Date().toISOString() };
      if (existing) Object.assign(existing, data);
      else db.admissions.unshift({ id: "j" + crypto.randomUUID().slice(0, 8), status: "pending", ...data });
      const plan = db.plans.find((p) => p.id === planId);
      return { firstName: name.split(" ")[0], total: plan.price + (db.settings.admissionFee || 0), gymName: db.settings.gymName };
    });
    refresh();
    return { ok: true, ...result };
  } catch (e) {
    return fail(e);
  }
}

/** Staff: take the first payment and turn the request into a member. */
export async function approveAdmission(admissionId, amount, method) {
  try {
    await assertUser();
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Please enter a valid amount.");
    if (!PAYMENT_METHODS.includes(method)) throw new Error("Invalid payment method.");
    const today = todayIso();
    const result = await updateDb((db) => {
      const a = db.admissions?.find((x) => x.id === admissionId);
      if (!a || a.status !== "pending") throw new Error("This request was already handled.");
      const plan = db.plans.find((p) => p.id === a.planId) ?? db.plans[0];
      let member = db.members.find((m) => m.phone === a.phone);
      if (member) {
        Object.assign(member, { status: "active", planId: plan.id, dueDate: addMonths(today, plan.months) });
        delete member.leftAt; delete member.frozenAt;
      } else {
        member = {
          id: "m" + crypto.randomUUID().slice(0, 8), name: a.name, phone: a.phone, gender: a.gender, planId: plan.id,
          joinDate: today, dueDate: addMonths(today, plan.months), status: "active",
          ...(a.timing && a.timing !== "Flexible" && { notes: `${a.timing} batch${a.goal ? ` · Goal: ${a.goal}` : ""}` }),
        };
        db.members.push(member);
      }
      a.status = "approved";
      a.memberId = member.id;
      a.handledAt = new Date().toISOString();
      const payment = {
        id: crypto.randomUUID(), memberId: member.id, amount, date: today, method,
        receiptNo: db.meta.nextReceipt++, note: db.settings.admissionFee ? "Admission + first fee" : "First fee",
      };
      db.payments.unshift(payment);
      return { payment, member, receiptText: buildReceiptText(db, payment) };
    });
    refresh();
    return {
      ok: true,
      message: `${result.member.name} is now a member`,
      memberId: result.member.id,
      paymentId: result.payment.id,
      receiptNo: result.payment.receiptNo,
      receiptText: result.receiptText,
      phone: result.member.phone,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectAdmission(admissionId) {
  try {
    await assertUser();
    await updateDb((db) => {
      const a = db.admissions?.find((x) => x.id === admissionId);
      if (!a) throw new Error("Request not found.");
      a.status = "rejected";
      a.handledAt = new Date().toISOString();
    });
    refresh();
    return { ok: true, message: "Request removed" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------- expenses ----------------
export async function addExpense(_prev, fd) {
  try {
    await assertUser("owner");
    const amount = Number(str(fd, "amount").replace(/\D/g, ""));
    const category = str(fd, "category");
    const date = str(fd, "date");
    const note = str(fd, "note");
    if (!amount) throw new Error("Please enter the amount.");
    if (!EXPENSE_CATEGORIES.includes(category)) throw new Error("Please choose a category.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Please choose a date.");
    await updateDb((db) => {
      db.expenses.unshift({ id: crypto.randomUUID(), date, category, amount, note: note || category });
      db.expenses.sort((a, b) => b.date.localeCompare(a.date));
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, message: "Expense added" };
}

export async function deleteExpense(id) {
  try {
    await assertUser("owner");
    await updateDb((db) => { db.expenses = db.expenses.filter((e) => e.id !== id); });
    refresh();
    return { ok: true, message: "Expense deleted" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------- settings & users ----------------
export async function saveSettings(_prev, fd) {
  try {
    await assertUser("owner");
    await updateDb((db) => {
      const s = db.settings;
      s.gymName = str(fd, "gymName") || s.gymName;
      s.address = str(fd, "address");
      s.countryCode = str(fd, "countryCode").replace(/\D/g, "") || "92";
      s.phone = normalizePhone(str(fd, "phone"), s.countryCode);
      s.admissionFee = Math.max(0, Number(str(fd, "admissionFee").replace(/\D/g, "")) || 0);
      s.gymInfo = str(fd, "gymInfo");
      s.botEnabled = fd.get("botEnabled") === "on";
      s.autoReminders = fd.get("autoReminders") === "on";
      s.reminderHour = Math.max(6, Math.min(22, Number(str(fd, "reminderHour")) || 11));
      s.dueSoonDays = Math.max(0, Math.min(15, Number(str(fd, "dueSoonDays")) || 3));
      s.inactiveDays = Math.max(2, Math.min(60, Number(str(fd, "inactiveDays")) || 7));
      s.reminderTemplate = str(fd, "reminderTemplate") || s.reminderTemplate;
      s.comebackTemplate = str(fd, "comebackTemplate") || s.comebackTemplate;
      for (const p of db.plans) {
        const price = Number(str(fd, `plan_${p.id}`));
        if (Number.isFinite(price) && price > 0) p.price = Math.round(price);
      }
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, message: "Settings saved" };
}

export async function addStaff(_prev, fd) {
  try {
    await assertUser("owner");
    const name = str(fd, "name");
    const username = str(fd, "username").toLowerCase();
    const password = str(fd, "password");
    if (name.length < 2) throw new Error("Please enter a name.");
    if (!/^[a-z0-9._-]{3,20}$/.test(username)) throw new Error("Username: 3–20 letters or numbers, no spaces.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    await updateDb((db) => {
      if (db.users.some((u) => u.username === username)) throw new Error("This username is taken.");
      db.users.push({ id: "u" + crypto.randomUUID().slice(0, 8), name, username, role: "staff", password: hashPassword(password) });
    });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true, message: "Staff account created" };
}

export async function deleteUser(userId) {
  try {
    const me = await assertUser("owner");
    if (userId === me.id) throw new Error("You can't delete your own account.");
    await updateDb((db) => { db.users = db.users.filter((u) => u.id !== userId); });
    refresh();
    return { ok: true, message: "Account deleted" };
  } catch (e) {
    return fail(e);
  }
}

export async function changePassword(_prev, fd) {
  try {
    await assertUser("owner");
    const userId = str(fd, "userId");
    const password = str(fd, "password");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    await updateDb((db) => {
      const u = db.users.find((x) => x.id === userId);
      if (!u) throw new Error("User not found.");
      u.password = hashPassword(password);
    });
  } catch (e) {
    return fail(e);
  }
  return { ok: true, message: "Password changed" };
}

export async function resetDemoData() {
  try {
    await assertUser("owner");
    await resetDb();
    refresh();
    return { ok: true, message: "Demo data has been reset" };
  } catch (e) {
    return fail(e);
  }
}
