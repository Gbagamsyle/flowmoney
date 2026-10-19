import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import {
  daysBetween,
  timingLabel,
  type DashboardWarning,
} from "@/lib/dashboard-view";

export function CoverageRing({
  coverage,
  mixed,
}: {
  coverage: number | null;
  mixed: boolean;
}) {
  const circumference = 2 * Math.PI * 54;
  return (
    <div
      className="relative size-32 shrink-0"
      role="img"
      aria-label={
        mixed
          ? "Coverage unavailable for mixed currencies"
          : coverage === null
            ? "No commitment and buffer target to measure"
            : `${coverage}% of commitments and buffer covered by recorded funds`
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 128 128"
        className="size-full -rotate-90"
      >
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-foreground/10"
        />
        {coverage !== null && (
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(circumference * coverage) / 100} ${circumference}`}
            className="text-foreground"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {coverage === null ? "—" : `${coverage}%`}
        </span>
        <span className="mt-1 text-[10px] text-muted-foreground">
          {mixed ? "Review needed" : "Covered"}
        </span>
      </div>
    </div>
  );
}
export function SourceMetric({
  icon: Icon,
  label,
  amount,
  note,
  href,
}: {
  icon: LucideIcon;
  label: string;
  amount: string;
  note: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {label}
        </p>
        {href && (
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
        )}
      </div>
      <p className="mt-3 break-all text-lg font-semibold tracking-tight tabular-nums">
        {amount}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{note}</p>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="min-w-0 border-b p-5 transition-colors last:border-b-0 hover:bg-muted/25 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-6"
    >
      {content}
    </Link>
  ) : (
    <div className="min-w-0 p-5 sm:p-6">{content}</div>
  );
}
export function MoneyRow({
  title,
  amount,
  date,
  today,
  detail,
  icon: Icon,
  delayed = false,
}: {
  title: string;
  amount: string;
  date: string;
  today: string;
  detail: string;
  icon: LucideIcon;
  delayed?: boolean;
}) {
  const overdue = (daysBetween(date, today) ?? 0) < 0;
  return (
    <div className="flex items-start gap-3 border-t py-4 first:border-t-0 last:pb-0">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/20">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p className="min-w-0 break-words text-sm font-medium">{title}</p>
          <p className="max-w-full break-all text-sm font-semibold tabular-nums">
            {amount}
          </p>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          {formatDate(date)} · {detail}
        </p>
        <p
          className={`mt-1 text-[10px] font-medium ${overdue || delayed ? "text-foreground" : "text-muted-foreground"}`}
        >
          {delayed ? "Marked delayed · " : ""}
          {timingLabel(date, today)}
        </p>
      </div>
    </div>
  );
}
export function WarningNote({
  warning,
  money,
}: {
  warning: DashboardWarning;
  money: (n: number) => string;
}) {
  const delayed = warning.code === "expected_income_delayed";
  return (
    <article>
      <div className="flex items-start gap-2">
        {delayed ? (
          <Clock3
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          />
        ) : (
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {delayed
              ? "A payment is delayed"
              : warning.code === "obligation_at_risk"
                ? "A commitment may be uncovered"
                : warning.code === "protected_obligations_shortfall"
                  ? "Funds don’t cover all reserves"
                  : "Account note"}
          </p>
          <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
            {warning.message}
          </p>
          {warning.amount !== undefined && (
            <p className="mt-1 text-xs font-medium tabular-nums">
              {delayed ? "Excluded from projection:" : "Amount to review:"}{" "}
              {money(warning.amount)}
            </p>
          )}
          <Link
            href={delayed ? "/income" : "/obligations"}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-4"
          >
            {delayed ? "Review income" : "Review commitments"}
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function ActionLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/30 sm:px-6"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/20">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <ArrowUpRight
        aria-hidden="true"
        className="mt-1 size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground"
      />
    </Link>
  );
}
export function EmptyList({
  text,
  href,
  action,
}: {
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-xl border border-dashed px-4 py-7">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
      >
        {action}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
    </div>
  );
}
export function humanize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
export function formatDate(value: string) {
  const date = new Date(value.slice(0, 10) + "T12:00:00Z");
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}
