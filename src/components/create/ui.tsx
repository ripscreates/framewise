import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function OptionCard({
  selected,
  onClick,
  title,
  desc,
  icon,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  icon?: ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-all",
        "hover:-translate-y-px hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary bg-secondary/60 shadow-soft ring-1 ring-primary/30",
      )}
    >
      {icon && (
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors",
            selected && "bg-gradient-brand text-primary-foreground",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {badge && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">{badge}</span>}
        </span>
        {desc && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{desc}</span>}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition-all",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function StepHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</div>
      <h2 className="mt-1 text-xl font-semibold md:text-2xl">{title}</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold">{label}</span>
      {hint && <span className="ml-2 text-[11px] text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed",
        tone === "info" ? "border-accent bg-accent/50 text-accent-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground",
      )}
    >
      {children}
    </div>
  );
}
