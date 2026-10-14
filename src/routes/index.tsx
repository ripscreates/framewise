import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, SkipForward, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { matchIntent, type IntentMatch } from "@/lib/intent";
import { readHistory } from "@/lib/history";
import type { DirHandle, QueuedFile } from "@/lib/files";
import { defaultSettings, OPERATIONS, STEP_META, summarize, toShell, type Operation, type Settings, type StepId } from "@/lib/workflow";
import { AudioStep, FilesStep, FormatStep, GoalStep, OutputStep, QualityStep, ResizeStep, SubtitlesStep, TrimStep } from "@/components/create/steps";
import { CommandBlock, ReviewStep, useCommands } from "@/components/create/ReviewStep";
import { Note } from "@/components/create/ui";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { repeat?: string } => (typeof s.repeat === "string" ? { repeat: s.repeat } : {}),
  head: () => ({
    meta: [
      { title: "Create — Framewise" },
      { name: "description", content: "Describe what you want to make and Framewise builds the FFmpeg command, step by step." },
      { property: "og:title", content: "Create — Framewise" },
      { property: "og:description", content: "A friendly, guided FFmpeg command builder with in-browser batch conversion." },
    ],
  }),
  component: Create,
});

const GUIDE: Record<StepId, string> = {
  goal: "Tell me what you're after in plain words. I match keywords locally in your browser — no AI service is contacted.",
  files: "Add files or a whole folder. With batch on, every file gets the same settings and its own output name.",
  format: "MP4 is the safe bet for sharing. WebM is smaller for the web; MOV suits Apple editing apps.",
  quality: "“Balanced” is invisible to most eyes. Go “Smaller” for messaging apps and email.",
  resize: "Vertical and square crop from the centre. Plain resolutions keep the original shape.",
  trim: "Trimming first also makes everything after it faster, since less video is processed.",
  audio: "Evening out volume helps with quiet recordings. Removing audio makes a silent clip.",
  subtitles: "A switchable track is quick and keeps the picture clean. Burn-in is permanent.",
  output: "New files never replace your originals. Choose a folder in Chrome/Edge, or download.",
  review: "Copy the command for desktop FFmpeg, or run it here. Real runs are saved to History.",
};

function Create() {
  const { repeat } = Route.useSearch();
  const [settings, setSettings] = useState<Settings>(() => defaultSettings("compress"));
  const [chosen, setChosen] = useState(false);
  const [step, setStep] = useState<StepId>("goal");
  const [done, setDone] = useState<Set<StepId>>(new Set());
  const [skipped, setSkipped] = useState<Set<StepId>>(new Set());
  const [intent, setIntent] = useState("");
  const [match, setMatch] = useState<IntentMatch | null>(null);
  const [queue, setQueueState] = useState<QueuedFile[]>([]);
  const [batch, setBatch] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sub, setSub] = useState<File | null>(null);
  const [dir, setDir] = useState<DirHandle | null>(null);
  const [repeatNote, setRepeatNote] = useState<string | null>(null);

  useEffect(() => {
    if (!repeat) return;
    const r = readHistory().find((x) => x.id === repeat);
    if (!r) return;
    setSettings(r.settings);
    setChosen(true);
    setDone(new Set(["goal"]));
    setStep("files");
    setRepeatNote(`Settings loaded from “${r.name}”. Browsers don't keep access to files, so add them again.`);
  }, [repeat]);

  const steps = OPERATIONS[settings.operation].steps;
  const idx = steps.indexOf(step);
  const upd = (fn: (s: Settings) => Settings) => setSettings(fn);
  const setQueue = (fn: (q: QueuedFile[]) => QueuedFile[]) => setQueueState(fn);
  const files = useMemo(() => (batch ? queue : queue.filter((q) => q.id === (activeId ?? queue[0]?.id))), [queue, batch, activeId]);
  const cmds = useCommands(settings, files, sub);

  const pick = (op: Operation, preset?: Settings) => {
    setSettings((prev) => ({ ...(preset ?? defaultSettings(op)), output: preset?.output ?? (prev.operation === op ? prev.output : defaultSettings(op).output) }));
    setChosen(true);
    setDone(new Set());
    setSkipped(new Set());
  };
  const go = (id: StepId) => setStep(id);
  const next = () => {
    setDone((d) => new Set(d).add(step));
    setSkipped((sk) => {
      const n = new Set(sk);
      n.delete(step);
      return n;
    });
    if (step === "quality") upd((s) => ({ ...s, quality: { ...s.quality, enabled: true } }));
    if (step === "resize") upd((s) => ({ ...s, resize: { ...s.resize, enabled: true } }));
    if (step === "trim") upd((s) => ({ ...s, trim: { ...s.trim, enabled: true } }));
    if (step === "subtitles") upd((s) => ({ ...s, subtitles: { ...s.subtitles, enabled: true } }));
    if (idx < steps.length - 1) go(steps[idx + 1]);
  };
  const skip = () => {
    setSkipped((sk) => new Set(sk).add(step));
    setDone((d) => {
      const n = new Set(d);
      n.delete(step);
      return n;
    });
    upd((s) => {
      const d = defaultSettings(s.operation);
      switch (step) {
        case "quality": return { ...s, quality: { ...s.quality, enabled: false } };
        case "resize": return { ...s, resize: { ...s.resize, enabled: false } };
        case "trim": return { ...s, trim: { ...s.trim, enabled: false } };
        case "audio": return { ...s, audio: { ...s.audio, mode: "keep" } };
        case "subtitles": return { ...s, subtitles: { ...s.subtitles, enabled: false } };
        case "format": return { ...s, format: d.format };
        case "output": return { ...s, output: d.output };
        default: return s;
      }
    });
    if (idx < steps.length - 1) go(steps[idx + 1]);
  };
  const reset = () => {
    setSettings(defaultSettings("compress"));
    setChosen(false);
    setStep("goal");
    setDone(new Set());
    setSkipped(new Set());
    setMatch(null);
    setIntent("");
    setQueueState([]);
    setSub(null);
    setRepeatNote(null);
  };

  const upcoming = steps[idx + 1];
  const canContinue = step !== "goal" || chosen;

  return (
    <div>
      <TopBar
        title="Create"
        subtitle={chosen ? summarize(settings) : "Start with what you want to make"}
        actions={
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" /> Start over
          </Button>
        }
      />
      <div className="border-b px-5 py-3 md:px-8">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-brand transition-all duration-500" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
        </div>
        <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Steps">
          {steps.map((id, i) => {
            const state = id === step ? "current" : done.has(id) ? "done" : skipped.has(id) ? "skipped" : "todo";
            const disabled = !chosen && id !== "goal";
            return (
              <button
                key={id}
                disabled={disabled}
                onClick={() => go(id)}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                  state === "current" && "border-primary bg-primary text-primary-foreground",
                  state === "done" && "border-primary/30 bg-secondary text-secondary-foreground",
                  state === "skipped" && "border-dashed text-muted-foreground line-through decoration-1",
                  state === "todo" && "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3" /> : <span className="tabular-nums">{i + 1}</span>}
                {STEP_META[id].label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid gap-6 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 animate-rise" key={step}>
          {repeatNote && step === "files" && <div className="mb-4"><Note>{repeatNote}</Note></div>}
          {step === "goal" && (
            <GoalStep
              operation={settings.operation}
              hasChosen={chosen}
              intent={intent}
              setIntent={setIntent}
              match={match}
              onAsk={(t) => {
                const m = matchIntent(t);
                if (!m) return;
                setMatch(m);
                if (m.confident) pick(m.operation, m.settings);
              }}
              onPick={(op) => {
                setMatch(null);
                pick(op);
              }}
            />
          )}
          {step === "files" && <FilesStep queue={queue} setQueue={setQueue} batch={batch} setBatch={setBatch} activeId={activeId ?? queue[0]?.id ?? null} setActiveId={setActiveId} operation={settings.operation} />}
          {step === "format" && <FormatStep s={settings} upd={upd} />}
          {step === "quality" && <QualityStep s={settings} upd={upd} />}
          {step === "resize" && <ResizeStep s={settings} upd={upd} />}
          {step === "trim" && <TrimStep s={settings} upd={upd} />}
          {step === "audio" && <AudioStep s={settings} upd={upd} />}
          {step === "subtitles" && <SubtitlesStep s={settings} upd={upd} sub={sub} setSub={setSub} />}
          {step === "output" && <OutputStep s={settings} upd={upd} names={files.map((f) => f.file.name)} dir={dir} setDir={setDir} />}
          {step === "review" && <ReviewStep s={settings} files={files} sub={sub} dir={dir} onEdit={go} />}

          {step !== "review" && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-5">
              {idx > 0 && (
                <Button variant="ghost" onClick={() => go(steps[idx - 1])}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                {STEP_META[step].skippable && (
                  <Button variant="outline" onClick={skip}>
                    <SkipForward className="size-4" /> Skip this step
                  </Button>
                )}
                <Button variant="brand" onClick={next} disabled={!canContinue}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Wand2 className="size-3.5" /> Guide · {STEP_META[step].label}
            </div>
            <p className="mt-2 text-sm leading-relaxed">{GUIDE[step]}</p>
            {upcoming && chosen && (
              <button onClick={() => go(upcoming)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-gradient-soft px-3 py-2.5 text-left text-xs font-medium hover:brightness-[0.98]">
                <span>
                  <span className="text-muted-foreground">Up next: </span>
                  {STEP_META[upcoming].label}
                </span>
                <ArrowRight className="size-3.5 text-primary" />
              </button>
            )}
          </div>
          {chosen && step !== "review" && (
            <div className="surface-card p-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                Live command
                <button className="text-primary hover:underline" onClick={() => go("review")}>Review</button>
              </div>
              <CommandBlock text={toShell(cmds[0].parts)} />
              {cmds.length > 1 && <p className="mt-2 text-[11px] text-muted-foreground">+ {cmds.length - 1} more with the same settings</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
