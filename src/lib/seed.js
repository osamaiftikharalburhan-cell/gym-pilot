// Realistic demo data generated relative to "today" so the demo always looks fresh.
import { addDays, addMonths, diffDays } from "./format";
import { hashPassword } from "./session";
import { zonedIso } from "./time";

export const DB_VERSION = 5;

const PLANS = [
  { id: "basic", name: "Gym Basic", price: 3000, months: 1 },
  { id: "cardio", name: "Gym + Cardio", price: 4500, months: 1 },
  { id: "pt", name: "Personal Training", price: 10000, months: 1 },
  { id: "quarter", name: "Quarterly Saver", price: 8000, months: 3 },
];

const MEN = [
  "Ali Raza", "Usman Tariq", "Hamza Sheikh", "Bilal Ahmed", "Fahad Iqbal", "Saad Malik", "Zain Abbas",
  "Hassan Javed", "Umar Farooq", "Ahmed Nawaz", "Danish Khan", "Talha Siddiqui", "Asad Mehmood",
  "Waqas Akram", "Shahzaib Hussain", "Arslan Butt", "Junaid Aslam", "Faizan Qureshi", "Haris Chaudhry",
  "Moiz Rehman", "Kamran Yousaf", "Noman Ali", "Rizwan Saeed", "Adeel Anwar", "Imran Latif", "Sohail Akhtar",
];
const WOMEN = [
  "Ayesha Khan", "Fatima Noor", "Hira Saleem", "Mahnoor Zafar", "Sana Riaz", "Iqra Shahid", "Zara Imran",
  "Amna Baig", "Maryam Asif", "Rabia Kanwal", "Laiba Aslam", "Noor Fatima",
];

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Gym-local date + time -> ISO string. */
const localIso = zonedIso;

export function createDemoDb(today, nowHour = 23) {
  const rand = rng(2024);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const methods = ["Cash", "Cash", "Cash", "JazzCash", "EasyPaisa", "Bank"];

  const people = [
    ...MEN.map((n) => ({ name: n, gender: "Male" })),
    ...WOMEN.map((n) => ({ name: n, gender: "Female" })),
  ].sort(() => rand() - 0.5);

  const members = [];
  const payments = [];
  const reminders = [];
  const attendance = [];

  people.forEach((p, i) => {
    const r0 = rand();
    const plan = r0 < 0.42 ? PLANS[0] : r0 < 0.72 ? PLANS[1] : r0 < 0.88 ? PLANS[2] : PLANS[3];
    const id = `m${String(i + 1).padStart(3, "0")}`;

    // Fee state spread: ~22% unpaid, ~12% due soon, rest paid.
    const r = rand();
    let offset;
    if (r < 0.22) offset = -Math.ceil(rand() * 28);
    else if (r < 0.34) offset = Math.floor(rand() * 4);
    else offset = 4 + Math.floor(rand() * 24);
    const dueDate = addDays(today, offset);

    const cycles = plan.months === 3 ? 1 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 9);
    const joinDate = addMonths(dueDate, -plan.months * cycles);
    const phone = "923" + pick(["0", "1", "2", "3", "4"]) + String(10000000 + Math.floor(rand() * 89999999));

    // A couple of frozen / inactive members for realism.
    let status = "active";
    let frozenAt, leftAt;
    if (i === 5) { status = "frozen"; frozenAt = addDays(today, -9); }
    if (i === 11 || i === 23) { status = "inactive"; leftAt = addDays(today, -20 - i); }

    members.push({
      id, name: p.name, phone, gender: p.gender, planId: plan.id, joinDate, dueDate, status,
      ...(frozenAt && { frozenAt }), ...(leftAt && { leftAt }),
      ...(i % 7 === 0 && { notes: "Morning batch" }),
    });

    for (let c = 0; c < cycles; c++) {
      const paidOn = addDays(addMonths(joinDate, plan.months * c), Math.floor(rand() * 4));
      if (diffDays(paidOn, today) > 0) continue;
      if (status === "inactive" && diffDays(paidOn, leftAt) > 0) continue;
      payments.push({ id: `p${id}-${c}`, memberId: id, amount: plan.price, date: paidOn, method: pick(methods) });
    }

    if (offset < -5 && status === "active" && rand() < 0.5) {
      const date = addDays(today, -Math.ceil(rand() * 4));
      reminders.push({ id: `r${id}`, memberId: id, date, at: localIso(date, 11, 30) });
    }

    // Attendance for the last 35 days.
    if (status === "inactive") return;
    const ghost = rand() < 0.18 ? 8 + Math.floor(rand() * 15) : 0; // hasn't come for a while
    const regularity = 0.3 + rand() * 0.45;
    const prefHour = pick([6, 7, 8, 17, 18, 19, 20, 21]);
    for (let d = 34; d >= 0; d--) {
      if (status === "frozen" && d < 10) continue;
      if (d < ghost) continue;
      const date = addDays(today, -d);
      if (date < joinDate) continue;
      if (rand() > regularity) continue;
      const hour = Math.min(22, prefHour + Math.floor(rand() * 2));
      if (d === 0 && hour >= nowHour) continue;
      attendance.push({ id: `a${id}-${d}`, memberId: id, date, at: localIso(date, hour, Math.floor(rand() * 60)) });
    }
  });

  // Receipt numbers in chronological order.
  payments.sort((a, b) => a.date.localeCompare(b.date));
  payments.forEach((p, i) => (p.receiptNo = 1001 + i));
  payments.reverse();

  // Expenses for the last 6 months.
  const expenses = [];
  for (let k = 5; k >= 0; k--) {
    const ym = addMonths(today.slice(0, 7) + "-01", -k).slice(0, 7);
    const add = (day, category, amount, note) => {
      const date = `${ym}-${String(day).padStart(2, "0")}`;
      if (date <= today) expenses.push({ id: `e${ym}-${expenses.length}`, date, category, amount, note });
    };
    add(5, "Rent", 35000, "Monthly rent");
    add(28, "Salaries", 25000, "Trainer salary");
    add(28, "Salaries", 10000, "Cleaner salary");
    add(6, "Utilities", 2500, "Internet");
    add(18, "Utilities", 12000 + Math.round(rand() * 6) * 1000, "Electricity bill");
    add(12 + Math.floor(rand() * 10), "Maintenance", 1500 + Math.round(rand() * 9) * 500, pick(["Treadmill belt", "AC service", "Cable repair", "Plumbing"]));
    if (rand() < 0.35) add(18, "Equipment", 15000 + Math.round(rand() * 3) * 5000, pick(["New dumbbells", "Bench press", "Kettlebells set"]));
    add(20, "Other", 1000 + Math.round(rand() * 6) * 250, pick(["Cleaning supplies", "Water bottles", "Stationery"]));
  }
  expenses.sort((a, b) => b.date.localeCompare(a.date));

  // A few people who scanned the "Join" QR and are waiting for approval.
  const admissions = [
    { name: "Shoaib Akram", phone: "923215554411", gender: "Male", planId: "cardio", timing: "Evening", goal: "Weight loss", daysAgo: 0, at: [10, 15] },
    { name: "Areeba Tariq", phone: "923334448822", gender: "Female", planId: "basic", timing: "Ladies time", goal: "General fitness", daysAgo: 0, at: [9, 40] },
    { name: "Hammad Ali", phone: "923006667733", gender: "Male", planId: "pt", timing: "Morning", goal: "Muscle gain", daysAgo: 1, at: [19, 5] },
  ].map((a, i) => ({
    id: `j${i + 1}`, name: a.name, phone: a.phone, gender: a.gender, planId: a.planId, timing: a.timing, goal: a.goal,
    status: "pending", at: localIso(addDays(today, -a.daysAgo), ...a.at),
  })).filter((a) => a.at <= new Date().toISOString());

  return {
    version: DB_VERSION,
    meta: { nextReceipt: 1001 + payments.length },
    settings: {
      gymName: "GymPilot",
      phone: "923001234567",
      address: "Main Boulevard, Lahore",
      countryCode: "92",
      admissionFee: 2000,
      dueSoonDays: 3,
      inactiveDays: 7,
      gymInfo: [
        "Timings: Monday to Saturday 6 AM – 11 PM, Sunday closed.",
        "Ladies time: 11 AM – 3 PM daily.",
        "Facilities: free weights, machines, cardio area, changing rooms, lockers, drinking water.",
        "Personal trainers are available on the Personal Training plan.",
        "Payment methods: Cash, JazzCash, EasyPaisa, bank transfer.",
      ].join("\n"),
      botEnabled: true,
      autoReminders: true,
      reminderHour: 11,
      reminderTemplate:
        "Hi {name}! 💪\nThis is a friendly reminder from {gym}: your {plan} fee of {amount} is due on {dueDate}.\nPlease clear it at your earliest convenience. Thank you!",
      comebackTemplate:
        "Hi {name}! We haven't seen you at {gym} for {days} days. Your fitness goals are waiting for you 💪 See you at the gym soon!",
    },
    users: [
      { id: "u1", name: "Kashif Mehmood", username: "owner", role: "owner", password: hashPassword("owner123") },
      { id: "u2", name: "Adnan Shah", username: "staff", role: "staff", password: hashPassword("staff123") },
    ],
    plans: PLANS,
    members,
    payments,
    reminders,
    attendance,
    expenses,
    admissions,
  };
}
