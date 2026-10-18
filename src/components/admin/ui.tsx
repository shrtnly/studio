"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { avatarGradient, initials } from "@/lib/admin-data";
import { Database, ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

/* Page header ------------------------------------------------------- */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-1.5">{eyebrow}</p>
        )}
        <h1 className="text-2xl sm:text-[28px] font-semibold font-headline tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Panel (minimal card) ---------------------------------------------- */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("px-5 pb-5", !title && !action && "pt-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* Stat card ---------------------------------------------------------- */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "primary",
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  trend?: number | null;
  tone?: "primary" | "accent" | "emerald" | "violet";
  href?: string;
}) {
  const tones: Record<string, string> = {
    primary: "text-sky-500 bg-sky-500/10 ring-sky-500/20",
    accent: "text-orange-500 bg-orange-500/10 ring-orange-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20",
    violet: "text-violet-500 bg-violet-500/10 ring-violet-500/20",
  };
  const content = (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-lg hover:shadow-black/5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-accent/10 to-transparent opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg ring-1", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-semibold font-headline tracking-tight tabular-nums">{value}</span>
        {typeof trend === "number" && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              trend >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/* Status chip -------------------------------------------------------- */
export function StatusChip({ label, chip, dot }: { label: string; chip: string; dot?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", chip)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {label}
    </span>
  );
}

/* Avatar ------------------------------------------------------------- */
export function InitialsAvatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-base" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm",
        avatarGradient(name),
        sizes[size]
      )}
    >
      {initials(name)}
    </span>
  );
}

/* Empty state -------------------------------------------------------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* Missing table notice ---------------------------------------------- */
export function MissingTableNotice({ table }: { table: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div>
        <p className="font-medium">
          The <code className="rounded bg-muted px-1 py-0.5 text-xs">{table}</code> table doesn&apos;t exist yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Run <code className="rounded bg-muted px-1 py-0.5">supabase/migrations/20261018_admin_dashboard.sql</code> in
          your Supabase SQL Editor, then refresh this page.
        </p>
      </div>
    </div>
  );
}

/* Styled native select ---------------------------------------------- */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:border-border focus:outline-none focus:ring-2 focus:ring-ring/40",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
NativeSelect.displayName = "NativeSelect";

/* Segmented filter pills -------------------------------------------- */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {typeof o.count === "number" && (
            <span className={cn("tabular-nums text-[10px]", value === o.value ? "text-accent" : "opacity-60")}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
