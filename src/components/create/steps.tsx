import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Captions,
  FileVideo,
  FolderOpen,
  FolderDown,
  Film,
  Gauge,
  ImagePlay,
  Maximize2,
  Minimize2,
  Music,
  RectangleVertical,
  Repeat2,
  Scissors,
  Smartphone,
  Square,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/history";
import {
  canWriteFolders,
  dirFromDrop,
  filesFromDrop,
  isMedia,
  pickDirectory,
  toQueued,
  type DirHandle,
  type QueuedFile,
} from "@/lib/files";
import {
  AUDIO_FORMATS,
  effectiveFormat,
  isValidTime,
  OPERATIONS,
  outputNames,
  VIDEO_FORMATS,
  type Operation,
  type QualityLevel,
  type ResizePreset,
  type Settings,
  type Speed,
} from "@/lib/workflow";
import type { IntentMatch } from "@/lib/intent";
import { Field, Note, OptionCard, StepHeading } from "./ui";

type Upd = (fn: (s: Settings) => Settings) => void;

const OP_ICONS: Record<Operation, ReactNode> = {
  compress: <Minimize2 className="size-4" />,
  convert: <Repeat2 className="size-4" />,
  trim: <Scissors className="size-4" />,
  "extract-audio": <Music className="size-4" />,
  resize: <Smartphone className="size-4" />,
  subtitles: <Captions className="size-4" />,
  gif: <ImagePlay className="size-4" />,
};

const EXAMPLES = [
  "Make this video small enough to email",
  "Turn my MOV into an MP4",
  "Keep the first 30 seconds",
  "Vertical version for TikTok",
  "Get the audio as MP3",
];

export function GoalStep({
  operation,
  hasChosen,
  intent,
  setIntent,
  match,
  onAsk,
  onPick,
}: {
  operation: Operation;
  hasChosen: boolean;
  intent: string;
  setIntent: (v: string) => void;
  match: IntentMatch | null;
  onAsk: (text: string) => void;
  onPick: (op: Operation) => void;
}) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border bg-card p-5 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow" aria-hidden />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Wand2 className="size-3" /> Guide
          </div>
          <h2 className="mt-3 text-2xl font-semibold md:text-[32px] md:leading-tight">
            What would you like to <span className="text-gradient-brand">make?</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Describe it in your own words, or pick a starting point below. I'll line up the FFmpeg steps that fit.
          </p>
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              onAsk(intent);
            }}
          >
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onAsk(intent);
                }
              }}
              rows={2}
              placeholder="e.g. shrink my screen recording so it fits in an email"
              className="min-h-[52px] resize-none bg-card text-[15px]"
              aria-label="Describe what you want to make"
            />
            <Button type="submit" variant="brand" size="lg" className="sm:h-auto" disabled={!intent.trim()}>
              Guide me <ArrowRight className="size-4" />
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setIntent(ex);
                  onAsk(ex);
                }}
                className="rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                “{ex}”
              </button>
            ))}
          </div>
        </div>
      </div>

      {match && (
        <div className="animate-rise mt-4 flex gap-3 rounded-2xl border border-primary/25 bg-secondary/50 p-4">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
            <Wand2 className="size-4" />
          </div>
          <div className="text-sm leading-relaxed">
            <p>{match.reply}</p>
            {!match.confident && (
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a starting point below, or <Link to="/help" className="font-semibold text-primary hover:underline">see the FFmpeg references</Link>.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Or start from</div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Starting point">
          {(Object.keys(OPERATIONS) as Operation[]).map((op) => (
            <OptionCard
              key={op}
              selected={hasChosen && operation === op}
              onClick={() => onPick(op)}
              icon={OP_ICONS[op]}
              title={OPERATIONS[op].label}
              desc={OPERATIONS[op].blurb}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FilesStep({
  queue,
  setQueue,
  batch,
  setBatch,
  activeId,
  setActiveId,
  operation,
}: {
  queue: QueuedFile[];
  setQueue: (fn: (q: QueuedFile[]) => QueuedFile[]) => void;
  batch: boolean;
  setBatch: (v: boolean) => void;
  activeId: string | null;
  setActiveId: (id: string) => void;
  operation: Operation;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const add = (items: { file: File; path: string }[]) => {
    const media = items.filter((i) => isMedia(i.file));
    setSkipped(items.length - media.length);
    setQueue((q) => {
      const seen = new Set(q.map((x) => `${x.path}:${x.file.size}`));
      const fresh = media.filter((m) => !seen.has(`${m.path}:${m.file.size}`));
      return [...q, ...toQueued(fresh.map((m) => m.file), fresh.map((m) => m.path))];
    });
  };
  const total = queue.reduce((n, q) => n + q.file.size, 0);
  const big = queue.some((q) => q.file.size > 1.5 * 1024 ** 3);

  return (
    <div>
      <StepHeading
        eyebrow="Step · Files"
        title="Add the files to work on"
        desc={`Drop in one file or a whole folder. ${operation === "gif" ? "Short clips work best for GIFs." : "Everything stays on your computer — nothing is uploaded."}`}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setOver(false);
          add(await filesFromDrop(e.dataTransfer));
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface px-6 py-10 text-center transition-all",
          over && "border-primary bg-secondary/60 shadow-lift",
        )}
      >
        <div className="grid size-12 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
          <Upload className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold">Drag files or folders here</p>
        <p className="mt-1 text-xs text-muted-foreground">Video and audio files — MP4, MOV, MKV, WebM, MP3, WAV and more</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileVideo className="size-4" /> Choose files
          </Button>
          <Button variant="outline" onClick={() => dirRef.current?.click()}>
            <FolderOpen className="size-4" /> Choose a folder
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="video/*,audio/*,.mkv,.mov,.m4v,.ts"
          className="hidden"
          onChange={(e) => {
            add(Array.from(e.target.files || []).map((f) => ({ file: f, path: f.name })));
            e.target.value = "";
          }}
        />
        <input
          ref={dirRef}
          type="file"
          multiple
          className="hidden"
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          onChange={(e) => {
            add(Array.from(e.target.files || []).map((f) => ({ file: f, path: f.webkitRelativePath || f.name })));
            e.target.value = "";
          }}
        />
      </div>
      {skipped > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Skipped {skipped} non-media file{skipped > 1 ? "s" : ""}.
        </p>
      )}

      {queue.length > 0 && (
        <div className="mt-5 rounded-2xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="text-sm font-semibold">
              {queue.length} file{queue.length > 1 ? "s" : ""} <span className="font-normal text-muted-foreground">· {formatBytes(total)}</span>
            </div>
            <div className="flex items-center gap-4">
              {queue.length > 1 && (
                <label className="flex items-center gap-2 text-xs font-medium">
                  <Switch checked={batch} onCheckedChange={setBatch} aria-label="Batch mode" />
                  Apply the same settings to every file
                </label>
              )}
              <Button variant="ghost" size="sm" onClick={() => setQueue(() => [])}>
                <Trash2 className="size-3.5" /> Clear
              </Button>
            </div>
          </div>
          <ul className="max-h-72 divide-y overflow-auto">
            {queue.map((q) => {
              const active = !batch && q.id === activeId;
              return (
                <li
                  key={q.id}
                  className={cn("flex items-center gap-3 px-4 py-2.5", !batch && "cursor-pointer hover:bg-muted/50", active && "bg-secondary/60")}
                  onClick={() => !batch && setActiveId(q.id)}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    {q.file.type.startsWith("audio") ? <AudioLines className="size-4" /> : <Film className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{q.path}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatBytes(q.file.size)} · {q.file.type || "unknown type"}
                    </div>
                  </div>
                  {!batch && (
                    <span className={cn("text-[11px] font-semibold", active ? "text-primary" : "text-muted-foreground/60")}>
                      {active ? "Selected" : "Use this"}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${q.file.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueue((all) => all.filter((x) => x.id !== q.id));
                    }}
                    className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          {!batch && queue.length > 1 && (
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">Batch is off — only the selected file will be processed.</p>
          )}
        </div>
      )}
      {big && (
        <div className="mt-3">
          <Note tone="warn">
            Files over ~1.5 GB may be too large for the in-browser engine's memory. The command will still work in desktop FFmpeg.
          </Note>
        </div>
      )}
    </div>
  );
}

export function FormatStep({ s, upd }: { s: Settings; upd: Upd }) {
  const audio = s.operation === "extract-audio";
  const list = audio ? AUDIO_FORMATS : VIDEO_FORMATS;
  const desc: Record<string, string> = {
    mp4: "Plays everywhere — phones, browsers, editors",
    webm: "Open format, great for the web, smaller files",
    mov: "Apple-friendly, good for Final Cut & iMovie",
    mkv: "Flexible container, keeps multiple tracks",
    mp3: "Universal music & podcast format",
    m4a: "AAC audio, great quality for its size",
    wav: "Uncompressed and lossless — big files",
    ogg: "Open Vorbis audio for web and games",
  };
  const fmt = effectiveFormat(s);
  return (
    <div>
      <StepHeading
        eyebrow="Step · Format"
        title={audio ? "Which audio format?" : "Which format should it be?"}
        desc="If you're not sure, the first option is the safest choice."
      />
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
        {list.map((f, i) => (
          <OptionCard
            key={f}
            selected={fmt === f}
            onClick={() => upd((x) => ({ ...x, format: f }))}
            title={f.toUpperCase()}
            desc={desc[f]}
            badge={i === 0 ? "Recommended" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function QualityStep({ s, upd }: { s: Settings; upd: Upd }) {
  const levels: { v: QualityLevel; d: string }[] = [
    { v: "high", d: "Looks like the original. Large files." },
    { v: "balanced", d: "Hard to tell apart, much smaller." },
    { v: "small", d: "Great for sharing and messaging." },
    { v: "tiny", d: "Smallest size; some visible softness." },
  ];
  const speeds: { v: Speed; t: string; d: string }[] = [
    { v: "fast", t: "Quick", d: "Finish sooner, slightly bigger" },
    { v: "balanced", t: "Balanced", d: "Good default" },
    { v: "thorough", t: "Thorough", d: "Slower, squeezes more" },
  ];
  const names = { high: "Near-original", balanced: "Balanced", small: "Smaller file", tiny: "Smallest" };
  return (
    <div>
      <StepHeading eyebrow="Step · Quality" title="How should quality and size trade off?" desc="FFmpeg uses a quality target (CRF) rather than a fixed size, so every file gets the bits it actually needs." />
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
        {levels.map((l) => (
          <OptionCard
            key={l.v}
            selected={s.quality.level === l.v}
            onClick={() => upd((x) => ({ ...x, quality: { ...x.quality, enabled: true, level: l.v } }))}
            icon={<Gauge className="size-4" />}
            title={names[l.v]}
            desc={l.d}
          />
        ))}
      </div>
      <div className="mt-6 text-xs font-semibold">Encoding speed</div>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-3" role="radiogroup">
        {speeds.map((sp) => (
          <OptionCard
            key={sp.v}
            selected={s.quality.speed === sp.v}
            onClick={() => upd((x) => ({ ...x, quality: { ...x.quality, enabled: true, speed: sp.v } }))}
            title={sp.t}
            desc={sp.d}
          />
        ))}
      </div>
      <div className="mt-4">
        <Note>In-browser encoding is slower than desktop FFmpeg. “Quick” is a good pick for long videos.</Note>
      </div>
    </div>
  );
}

export function ResizeStep({ s, upd }: { s: Settings; upd: Upd }) {
  if (s.operation === "gif") {
    return (
      <div>
        <StepHeading eyebrow="Step · Size" title="Size and smoothness" desc="Smaller and fewer frames keep GIFs light enough to share." />
        <div className="space-y-6 rounded-2xl border bg-card p-5">
          <Field label="Width" hint={`${s.gif.width}px`}>
            <Slider min={160} max={1080} step={20} value={[s.gif.width]} onValueChange={([v]) => upd((x) => ({ ...x, resize: { ...x.resize, enabled: true }, gif: { ...x.gif, width: v } }))} />
          </Field>
          <Field label="Frames per second" hint={`${s.gif.fps} fps`}>
            <Slider min={5} max={30} step={1} value={[s.gif.fps]} onValueChange={([v]) => upd((x) => ({ ...x, gif: { ...x.gif, fps: v } }))} />
          </Field>
        </div>
      </div>
    );
  }
  const opts: { v: ResizePreset; t: string; d: string; icon: ReactNode; badge?: string }[] = [
    { v: "vertical", t: "Vertical 9:16", d: "TikTok, Reels, Shorts, Stories · 1080×1920", icon: <RectangleVertical className="size-4" />, badge: "Social" },
    { v: "square", t: "Square 1:1", d: "Instagram & LinkedIn feed · 1080×1080", icon: <Square className="size-4" /> },
    { v: "1080p", t: "1080p", d: "Full HD, keeps the original shape", icon: <Maximize2 className="size-4" /> },
    { v: "720p", t: "720p", d: "HD — a great size/quality balance", icon: <Maximize2 className="size-4" /> },
    { v: "480p", t: "480p", d: "Small screens and quick previews", icon: <Minimize2 className="size-4" /> },
    { v: "custom", t: "Custom size", d: "Set exact width and height", icon: <Wand2 className="size-4" /> },
  ];
  return (
    <div>
      <StepHeading eyebrow="Step · Size" title="Resize or reframe?" desc="Social formats crop from the centre so nothing gets squashed." />
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
        {opts.map((o) => (
          <OptionCard
            key={o.v}
            selected={s.resize.enabled && s.resize.preset === o.v}
            onClick={() => upd((x) => ({ ...x, resize: { ...x.resize, enabled: true, preset: o.v } }))}
            icon={o.icon}
            title={o.t}
            desc={o.d}
            badge={o.badge}
          />
        ))}
      </div>
      {s.resize.enabled && s.resize.preset === "custom" && (
        <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
          <Field label="Width (px)">
            <Input type="number" min={16} max={7680} value={s.resize.width} onChange={(e) => upd((x) => ({ ...x, resize: { ...x.resize, width: Number(e.target.value) || 0 } }))} />
          </Field>
          <Field label="Height (px)">
            <Input type="number" min={16} max={4320} value={s.resize.height} onChange={(e) => upd((x) => ({ ...x, resize: { ...x.resize, height: Number(e.target.value) || 0 } }))} />
          </Field>
        </div>
      )}
    </div>
  );
}

export function TrimStep({ s, upd }: { s: Settings; upd: Upd }) {
  const startOk = !s.trim.start || isValidTime(s.trim.start);
  const endOk = !s.trim.end || isValidTime(s.trim.end);
  return (
    <div>
      <StepHeading eyebrow="Step · Trim" title="Keep only part of it?" desc="Use hours:minutes:seconds, or just seconds. Leave the end empty to go to the finish." />
      <div className="grid max-w-md grid-cols-2 gap-3 rounded-2xl border bg-card p-5">
        <Field label="Start">
          <Input
            value={s.trim.start}
            aria-invalid={!startOk}
            onChange={(e) => upd((x) => ({ ...x, trim: { ...x.trim, enabled: true, start: e.target.value } }))}
            placeholder="00:00:00"
            className="font-mono"
          />
        </Field>
        <Field label="End">
          <Input
            value={s.trim.end}
            aria-invalid={!endOk}
            onChange={(e) => upd((x) => ({ ...x, trim: { ...x.trim, enabled: true, end: e.target.value } }))}
            placeholder="end of file"
            className="font-mono"
          />
        </Field>
        {(!startOk || !endOk) && <p className="col-span-2 text-xs text-destructive">Times look like 00:01:30, 1:30 or 90.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          ["First 15s", "00:00:00", "00:00:15"],
          ["First 30s", "00:00:00", "00:00:30"],
          ["First minute", "00:00:00", "00:01:00"],
          ["Skip first 10s", "00:00:10", ""],
        ].map(([t, a, b]) => (
          <button
            key={t}
            type="button"
            onClick={() => upd((x) => ({ ...x, trim: { enabled: true, start: a, end: b } }))}
            className="rounded-full border bg-card px-3 py-1 text-xs hover:border-primary/40"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AudioStep({ s, upd }: { s: Settings; upd: Upd }) {
  const audioOnly = s.operation === "extract-audio";
  const fmt = effectiveFormat(s);
  return (
    <div>
      <StepHeading eyebrow="Step · Audio" title="What about the sound?" desc="Keep it as is, even out the volume, or remove it entirely." />
      <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup">
        <OptionCard selected={s.audio.mode === "keep"} onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, mode: "keep" } }))} icon={<Volume2 className="size-4" />} title="Keep audio" desc="Re-encode at a sensible bitrate" />
        <OptionCard selected={s.audio.mode === "normalize"} onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, mode: "normalize" } }))} icon={<AudioLines className="size-4" />} title="Even out volume" desc="Loudness normalisation" />
        {!audioOnly && (
          <OptionCard selected={s.audio.mode === "remove"} onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, mode: "remove" } }))} icon={<VolumeX className="size-4" />} title="Remove audio" desc="Silent output" />
        )}
      </div>
      {s.audio.mode !== "remove" && fmt !== "wav" && (
        <>
          <div className="mt-6 text-xs font-semibold">Audio bitrate</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["96k", "128k", "192k", "320k"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, bitrate: b } }))}
                className={cn(
                  "rounded-lg border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary/40",
                  s.audio.bitrate === b && "border-primary bg-secondary text-secondary-foreground",
                )}
              >
                {b}
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  {{ "96k": "voice", "128k": "standard", "192k": "music", "320k": "max" }[b]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SubtitlesStep({ s, upd, sub, setSub }: { s: Settings; upd: Upd; sub: File | null; setSub: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <StepHeading eyebrow="Step · Subtitles" title="Add a subtitle file" desc="Pick an .srt, .vtt or .ass file. It'll be applied to every video in the batch." />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <Button variant="outline" onClick={() => ref.current?.click()}>
          <Captions className="size-4" /> {sub ? "Replace file" : "Choose subtitle file"}
        </Button>
        {sub ? (
          <span className="flex items-center gap-2 text-sm">
            {sub.name} <span className="text-xs text-muted-foreground">{formatBytes(sub.size)}</span>
            <button type="button" aria-label="Remove subtitle file" onClick={() => setSub(null)} className="text-muted-foreground hover:text-destructive">
              <X className="size-3.5" />
            </button>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No file chosen yet</span>
        )}
        <input
          ref={ref}
          type="file"
          accept=".srt,.vtt,.ass,.ssa"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setSub(f);
            if (f) upd((x) => ({ ...x, subtitles: { ...x.subtitles, enabled: true } }));
            e.target.value = "";
          }}
        />
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2" role="radiogroup">
        <OptionCard selected={s.subtitles.mode === "soft"} onClick={() => upd((x) => ({ ...x, subtitles: { ...x.subtitles, enabled: true, mode: "soft" } }))} title="Switchable track" desc="Viewers can turn captions on/off. Fast — no re-drawing." badge="Recommended" />
        <OptionCard selected={s.subtitles.mode === "burn"} onClick={() => upd((x) => ({ ...x, subtitles: { ...x.subtitles, enabled: true, mode: "burn" } }))} title="Burn into picture" desc="Always visible, works on every platform." />
      </div>
      {s.subtitles.mode === "burn" && (
        <div className="mt-3">
          <Note tone="warn">Burning in needs fonts. The in-browser engine ships without system fonts, so this may fail here — the command works in desktop FFmpeg.</Note>
        </div>
      )}
    </div>
  );
}

export function OutputStep({
  s,
  upd,
  names,
  dir,
  setDir,
}: {
  s: Settings;
  upd: Upd;
  names: string[];
  dir: DirHandle | null;
  setDir: (d: DirHandle | null) => void;
}) {
  const [over, setOver] = useState(false);
  const supported = canWriteFolders();
  const preview = names.length ? outputNames(names, s) : outputNames(["my-video.mp4"], s);
  return (
    <div>
      <StepHeading eyebrow="Step · Output" title="Name it and choose where it goes" desc="Originals are never touched — Framewise always writes new files." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <Field label="Add to the end of each name" hint="optional">
            <Input value={s.output.suffix} onChange={(e) => upd((x) => ({ ...x, output: { suffix: e.target.value } }))} placeholder="-compressed" />
          </Field>
          <div className="mt-4 text-xs font-semibold">Preview</div>
          <ul className="mt-1.5 max-h-40 space-y-1 overflow-auto font-mono text-xs">
            {preview.slice(0, 8).map((n, i) => (
              <li key={i} className="truncate rounded-md bg-muted px-2 py-1">
                {n}
              </li>
            ))}
            {preview.length > 8 && <li className="text-muted-foreground">+ {preview.length - 8} more</li>}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">Duplicate names get -2, -3… so nothing is overwritten within a batch.</p>
        </div>

        <div
          onDragOver={(e) => {
            if (!supported) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setOver(false);
            const h = await dirFromDrop(e.dataTransfer).catch(() => null);
            if (h) setDir(h);
          }}
          className={cn("flex flex-col rounded-2xl border bg-card p-5 transition-all", over && "border-primary bg-secondary/60")}
        >
          <div className="text-xs font-semibold">Destination</div>
          {supported ? (
            <>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed bg-surface p-4">
                <FolderDown className="size-5 text-primary" />
                <div className="min-w-0 flex-1 text-sm">
                  {dir ? (
                    <>
                      <div className="truncate font-semibold">{dir.name}</div>
                      <div className="text-[11px] text-muted-foreground">Finished files are saved straight here</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">Downloads</div>
                      <div className="text-[11px] text-muted-foreground">Or drop a folder here / choose one</div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={async () => setDir(await pickDirectory())}>
                  <FolderOpen className="size-3.5" /> {dir ? "Change folder" : "Choose folder"}
                </Button>
                {dir && (
                  <Button variant="ghost" size="sm" onClick={() => setDir(null)}>
                    Use downloads
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-dashed bg-surface p-4">
                <Download className="size-5 text-primary" />
                <div className="text-sm">
                  <div className="font-semibold">Downloads</div>
                  <div className="text-[11px] text-muted-foreground">Each finished file gets a download button</div>
                </div>
              </div>
              <Note>This browser can't write directly into folders. Chrome or Edge on desktop can — everywhere else, files download instead.</Note>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
