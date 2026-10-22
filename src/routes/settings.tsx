import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CircleHelp,
  Cpu,
  ExternalLink,
  FolderSearch,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  activeNativeEngine,
  chooseNativeEngineFile,
  inspectNativeEngine,
  refreshNativeEngines,
  rememberSystemEngine,
  saveSelectedEngine,
  useIsDesktopApp,
  useNativeEngines,
  type NativeEngineInfo,
} from "@/lib/native-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function EngineCard({
  engine,
  selected,
  onSelect,
}: {
  engine: NativeEngineInfo;
  selected: boolean;
  onSelect: (engine: NativeEngineInfo) => void;
}) {
  return (
    <button
      type="button"
      disabled={!engine.compatible}
      onClick={() => onSelect(engine)}
      className={cn(
        "w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        selected && "border-primary bg-secondary/35 ring-1 ring-primary/25",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
            selected
              ? "bg-gradient-brand text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {selected ? <Check className="size-4" /> : <Cpu className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {engine.bundled ? "Framewise bundled engine" : "System FFmpeg"}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {engine.version}
            </span>
            {selected && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                In use
              </span>
            )}
          </span>
          <span className="mt-1 block break-all text-[11px] leading-relaxed text-muted-foreground">
            {engine.path}
          </span>
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold",
              engine.compatible ? "text-success" : "text-warning-foreground",
            )}
          >
            {engine.compatible ? (
              <ShieldCheck className="size-3.5" />
            ) : (
              <CircleHelp className="size-3.5" />
            )}
            {engine.compatible
              ? "Compatible with Framewise basics"
              : "Missing a required encoder or filter"}
          </span>
          {engine.compatible && (
            <span className="mt-2 block text-[11px] text-muted-foreground">
              {engine.encoders
                .filter((item) =>
                  [
                    "h264_videotoolbox",
                    "libx264",
                    "aac",
                    "libmp3lame",
                    "libvpx-vp9",
                    "libopus",
                  ].includes(item),
                )
                .join(" · ")}
            </span>
          )}
          <details className="mt-3 text-[11px] text-muted-foreground">
            <summary className="w-fit cursor-pointer font-semibold text-primary hover:underline">
              View engine capabilities
            </summary>
            <div className="mt-2 space-y-2">
              <div>
                <span className="font-semibold text-foreground">Encoders:</span>{" "}
                {engine.encoders.join(", ") || "none reported"}
              </div>
              <div>
                <span className="font-semibold text-foreground">Filters:</span>{" "}
                {engine.filters.join(", ") || "none reported"}
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-2 font-mono">
                {engine.buildConfiguration}
              </pre>
            </div>
          </details>
        </span>
      </div>
    </button>
  );
}

function SettingsPage() {
  const desktop = useIsDesktopApp();
  const engines = useNativeEngines();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = activeNativeEngine(engines.catalog);

  useEffect(() => setSelectedPath(active?.path ?? null), [active?.path]);

  const choose = (engine: NativeEngineInfo) => {
    saveSelectedEngine(engine);
    setSelectedPath(engine.path);
    toast.success(`${engine.bundled ? "Bundled" : "System"} FFmpeg selected`);
  };

  const locate = async () => {
    setBusy(true);
    try {
      const path = await chooseNativeEngineFile();
      if (!path) return;
      const engine = await inspectNativeEngine(path);
      rememberSystemEngine(engine);
      if (engine.compatible) choose(engine);
      else toast.warning("That FFmpeg build is missing one or more features Framewise needs.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not inspect that file.");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      await refreshNativeEngines();
      toast.success("FFmpeg engine check is up to date");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh engine information.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Settings" subtitle="Choose which FFmpeg engine Framewise uses on this Mac." />
      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6 md:px-8 md:py-8">
        {!desktop ? (
          <section className="rounded-2xl border bg-card p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <SlidersHorizontal className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Browser version</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  The web app keeps using its local WebAssembly engine. Native FFmpeg selection is
                  available in the Apple Silicon Mac app.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Engine
                  </div>
                  <h2 className="mt-1 text-lg font-semibold">
                    Choose the FFmpeg that runs your jobs
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    The bundled engine is the recommended default. You can switch to a compatible
                    FFmpeg already installed on your Mac.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={busy || engines.loading}
                >
                  <RefreshCw
                    className={cn("size-3.5", (busy || engines.loading) && "animate-spin")}
                  />{" "}
                  Refresh check
                </Button>
              </div>

              {engines.error && (
                <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {engines.error}
                </p>
              )}
              {engines.loading && !engines.catalog ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Checking for bundled and installed FFmpeg engines…
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {[
                    ...(engines.catalog?.bundled ? [engines.catalog.bundled] : []),
                    ...(engines.catalog?.system ?? []),
                  ].map((engine) => (
                    <EngineCard
                      key={engine.path}
                      engine={engine}
                      selected={selectedPath === engine.path}
                      onSelect={choose}
                    />
                  ))}
                  {!engines.catalog?.bundled && !engines.catalog?.system.length && (
                    <div className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
                      No compatible engine was found. Try locating an FFmpeg executable below.
                    </div>
                  )}
                </div>
              )}

              <Button className="mt-4" variant="outline" onClick={locate} disabled={busy}>
                <FolderSearch className="size-4" /> {busy ? "Checking…" : "Locate another FFmpeg"}
              </Button>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border bg-card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Engine updates
                </div>
                <h2 className="mt-1 font-semibold">Pinned version for this build</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The bundled engine is pinned to FFmpeg 9.0.2 and verified from FFmpeg’s signed
                  source release. Engine upgrades will be offered through a future Framewise release
                  after its signed download feed is published.
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  href="https://ffmpeg.org/download.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  FFmpeg release and signature details <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="rounded-2xl border bg-card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Compatibility
                </div>
                <h2 className="mt-1 font-semibold">Framewise checks what each engine can do</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Engine details include available encoders and filters. Some formats and subtitle
                  features need components that are only present in certain FFmpeg builds; Framewise
                  will flag those before a conversion starts.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
