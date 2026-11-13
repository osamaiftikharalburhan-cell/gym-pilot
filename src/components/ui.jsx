import { initials } from "@/lib/format";

export function cx(...c) {
  return c.filter(Boolean).join(" ");
}

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink cursor-pointer",
  primary: "bg-ink text-white hover:bg-ink-2 px-3.5 py-2",
  brand: "bg-brand text-ink hover:bg-[#b6e528] px-3.5 py-2",
  outline: "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 px-3.5 py-2",
  ghost: "text-gray-600 hover:bg-gray-100 px-2.5 py-1.5",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50 px-3.5 py-2",
  whatsapp: "bg-[#1fa855] text-white hover:bg-[#178a45] px-3 py-1.5",
  sm: "!px-2.5 !py-1.5 text-xs",
};

export function Card({ children, className }) {
  return (
    <div className={cx("rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS = {
  paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  due: { label: "Due soon", cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  unpaid: { label: "Unpaid", cls: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  frozen: { label: "Frozen", cls: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  inactive: { label: "Left", cls: "bg-gray-100 text-gray-600 ring-gray-500/20", dot: "bg-gray-400" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", s.cls)}>
      <span className={cx("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700", "bg-indigo-100 text-indigo-700",
];

export function Avatar({ name, size = "md", alert }) {
  const color = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span className="relative inline-flex shrink-0">
      <span className={cx("inline-flex items-center justify-center rounded-full font-semibold", color, size === "lg" ? "size-14 text-lg" : "size-9 text-xs")}>
        {initials(name)}
      </span>
      {alert && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-red-500" />}
    </span>
  );
}

export function Kpi({ icon: Icon, label, value, hint, tone = "default", valueTone }) {
  const tones = {
    default: "bg-gray-100 text-gray-700",
    brand: "bg-brand text-ink",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
  };
  const valueCls = { red: "text-red-600", green: "text-emerald-600" }[valueTone ?? tone] ?? "text-gray-900";
  return (
    <Card className="h-full p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 sm:text-sm">{label}</p>
        <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-lg", tones[tone])}><Icon className="size-4" /></span>
      </div>
      <p className={cx("mt-3 text-2xl font-semibold tracking-tight tabular sm:text-3xl", valueCls)}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}

export function Empty({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {Icon && <Icon className="size-8 text-gray-300" />}
      <p className="font-medium text-gray-700">{title}</p>
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-xl bg-gray-200/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
