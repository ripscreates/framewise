import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Clapperboard, History, LifeBuoy, Sparkles, Loader2 } from "lucide-react";
import { checkSupport, loadEngine, useEngine } from "@/lib/engine";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
        <Clapperboard className="size-[18px]" strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[17px] font-semibold tracking-tight">Framewise</div>
        <div className="text-[11px] text-muted-foreground">FFmpeg, made friendly</div>
      </div>
    </div>
  );
}

const nav = [
  { to: "/", label: "Create", icon: Sparkles },
  { to: "/history", label: "History", icon: History },
] as const;

export function EngineStatusPill({ compact = false }: { compact?: boolean }) {
  const e = useEngine();
  const dot = {
    idle: "bg-muted-foreground/40",
    loading: "bg-warning animate-pulse",
    ready: "bg-success",
    error: "bg-destructive",
    unsupported: "bg-destructive",
  }[e.status];
  const label = {
    idle: "Engine not loaded",
    loading: "Loading engine",
    ready: "Engine ready",
    error: "Engine failed",
    unsupported: "Not supported",
  }[e.status];
  return (
    <div className={cn("rounded-xl border bg-card p-3", compact && "p-2")}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        {e.status === "loading" ? <Loader2 className="size-3 animate-spin text-warning" /> : <span className={cn("size-2 rounded-full", dot)} />}
        FFmpeg · {label}
      </div>
      {!compact && <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">{e.message}</p>}
      {!compact && (e.status === "idle" || e.status === "error") && (
        <button
          onClick={() => loadEngine().catch(() => {})}
          className="mt-2 text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {e.status === "error" ? "Retry loading" : "Load now"}
        </button>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => checkSupport(), []);
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Logo />
        <nav className="mt-8 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <EngineStatusPill />
          <Link
            to="/help"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground data-[status=active]:text-sidebar-accent-foreground"
          >
            <LifeBuoy className="size-4" /> Help & how it works
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <nav className="flex items-center gap-1">
          {[...nav, { to: "/help", label: "Help", icon: LifeBuoy } as const].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              aria-label={label}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground"
            >
              <Icon className="size-4" />
            </Link>
          ))}
        </nav>
      </header>

      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function TopBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b px-5 py-5 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
