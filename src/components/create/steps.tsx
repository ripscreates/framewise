import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { toast } from "sonner";
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
  fromNativeMedia,
  pickDirectory,
  queuedSize,
  toQueued,
  type DirHandle,
  type QueuedFile,
} from "@/lib/files";
import {
  chooseNativeMedia,
  chooseNativeOutputFolder,
  chooseNativeSubtitle,
  nativeMediaFiles,
  useIsDesktopApp,
} from "@/lib/native-engine";
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

const EXAMPLES = [
  "Make this video small enough to email",
  "Turn my MOV into an MP4",
  "Keep the first 30 seconds",
  "Vertical version for TikTok",
  "Get the audio as MP3",
];

const PRESET_TITLES: Record<Operation, string> = {
  compress: "Compress video",
  convert: "Convert format",
  trim: "Trim a clip",
  "extract-audio": "Extract audio",
  resize: "Resize for social",
  subtitles: "Add subtitles",
  gif: "Make a GIF",
};

function PresetArtwork({ operation }: { operation: Operation }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      src={`/v2/presets/${operation}.png`}
      className="mx-auto block size-[76px] object-contain sm:size-[84px]"
      draggable={false}
    />
  );
}

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
  const [otherOpen, setOtherOpen] = useState(false);
  const queryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!hasChosen) setOtherOpen(false);
  }, [hasChosen]);

  useEffect(() => {
    if (otherOpen) queryRef.current?.focus();
  }, [otherOpen]);

  return (
    <div className="mx-auto max-w-5xl">
      {!otherOpen ? (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold md:text-[30px]">What would you like to do?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a starting point.</p>
            </div>
            {hasChosen && (
              <span className="text-xs text-muted-foreground">
                Selected: {PRESET_TITLES[operation]}
              </span>
            )}
          </div>
          <div
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
            role="group"
            aria-label="Choose a starting task"
          >
            {(Object.keys(OPERATIONS) as Operation[]).map((op) => (
              <button
                key={op}
                type="button"
                aria-pressed={hasChosen && operation === op}
                aria-label={`${PRESET_TITLES[op]}. ${OPERATIONS[op].blurb}`}
                onClick={() => onPick(op)}
                className={cn(
                  "group flex min-h-[132px] flex-col items-center justify-center rounded-2xl border bg-card px-2.5 py-3 text-center transition-colors",
                  "hover:border-primary/50 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  hasChosen &&
                    operation === op &&
                    "border-primary bg-secondary/50 ring-1 ring-primary/25",
                )}
              >
                <PresetArtwork operation={op} />
                <span className="mt-1 text-xs font-semibold leading-tight sm:text-sm">
                  {PRESET_TITLES[op]}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOtherOpen(true)}
              className="group flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/70 px-3 py-3 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Other: describe what you want to do"
            >
              <span className="grid size-[76px] place-items-center rounded-2xl bg-gradient-soft text-primary sm:size-[84px]">
                <Wand2 className="size-8" strokeWidth={1.7} />
              </span>
              <span className="mt-1 text-xs font-semibold sm:text-sm">Other</span>
            </button>
          </div>
          {hasChosen && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Choose another task, or continue with the selected one.
            </p>
          )}
        </>
      ) : (
        <div className="surface-card p-5 md:p-7">
          <button
            type="button"
            onClick={() => setOtherOpen(false)}
            className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
          >
            <ArrowRight className="size-3.5 rotate-180" /> Back to presets
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Wand2 className="size-3.5" /> Other task
          </div>
          <h2 className="mt-2 text-xl font-semibold md:text-2xl">Tell me what you want to do</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            I’ll match it to a starting workflow on this device.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              onAsk(intent);
            }}
          >
            <Textarea
              ref={queryRef}
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
              aria-label="Describe what you want to do"
            />
            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="sm:h-auto"
              disabled={!intent.trim()}
            >
              Find my steps <ArrowRight className="size-4" />
            </Button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Example requests">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setIntent(ex);
                  onAsk(ex);
                }}
                className="rounded-full border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ex}
              </button>
            ))}
          </div>
          {match && (
            <div
              className="animate-rise mt-4 flex gap-3 rounded-xl border border-primary/25 bg-secondary/50 p-4"
              role="status"
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                <Wand2 className="size-4" />
              </div>
              <div className="text-sm leading-relaxed">
                <p>{match.reply}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose a preset below, or{" "}
                  <Link to="/help" className="font-semibold text-primary hover:underline">
                    see the FFmpeg guide
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      )}
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
  const desktop = useIsDesktopApp();

  const add = (items: { file: File; path: string }[]) => {
    const media = items.filter((i) => isMedia(i.file));
    setSkipped(items.length - media.length);
    setQueue((q) => {
      const seen = new Set(q.map((x) => `${x.path}:${queuedSize(x)}`));
      const fresh = media.filter((m) => !seen.has(`${m.path}:${m.file.size}`));
      return [
        ...q,
        ...toQueued(
          fresh.map((m) => m.file),
          fresh.map((m) => m.path),
        ),
      ];
    });
  };
  const addNativeFiles = useCallback(
    (nativeFiles: Awaited<ReturnType<typeof nativeMediaFiles>>) => {
      const incoming = fromNativeMedia(nativeFiles);
      setSkipped(0);
      setQueue((current) => {
        const seen = new Set(current.map((item) => item.path));
        return [...current, ...incoming.filter((item) => !seen.has(item.path))];
      });
      if (nativeFiles.length >= 5000) toast.warning("Showing the first 5,000 matching files.");
    },
    [setQueue],
  );
  const addNative = useCallback(
    async (paths: string[]) => {
      try {
        addNativeFiles(await nativeMediaFiles(paths));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not read those media files.");
      }
    },
    [addNativeFiles],
  );
  useEffect(() => {
    if (!desktop) return;
    let unlisten: UnlistenFn | undefined;
    let mounted = true;
    getCurrentWindow()
      .onDragDropEvent(({ payload }) => {
        if (payload.type === "enter" || payload.type === "over") setOver(true);
        if (payload.type === "leave") setOver(false);
        if (payload.type === "drop") {
          setOver(false);
          void addNative(payload.paths);
        }
      })
      .then((stop) => {
        if (mounted) unlisten = stop;
        else stop();
      });
    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [desktop, addNative]);
  const total = queue.reduce((n, q) => n + queuedSize(q), 0);
  const big = queue.some((q) => queuedSize(q) > 1.5 * 1024 ** 3);

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
        <p className="mt-1 text-xs text-muted-foreground">
          Video and audio files — MP4, MOV, MKV, WebM, MP3, WAV and more
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (!desktop) return fileRef.current?.click();
              try {
                addNativeFiles(await chooseNativeMedia("files"));
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not choose those media files.",
                );
              }
            }}
          >
            <FileVideo className="size-4" /> Choose files
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!desktop) return dirRef.current?.click();
              try {
                addNativeFiles(await chooseNativeMedia("folder"));
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not choose that media folder.",
                );
              }
            }}
          >
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
            add(
              Array.from(e.target.files || []).map((f) => ({
                file: f,
                path: f.webkitRelativePath || f.name,
              })),
            );
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
              {queue.length} file{queue.length > 1 ? "s" : ""}{" "}
              <span className="font-normal text-muted-foreground">· {formatBytes(total)}</span>
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
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    !batch && "cursor-pointer hover:bg-muted/50",
                    active && "bg-secondary/60",
                  )}
                  onClick={() => !batch && setActiveId(q.id)}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    {q.file.type.startsWith("audio") ||
                    /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(q.file.name) ? (
                      <AudioLines className="size-4" />
                    ) : (
                      <Film className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{q.path}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatBytes(queuedSize(q))} ·{" "}
                      {q.file.type || q.file.name.split(".").pop()?.toUpperCase() || "media"}
                    </div>
                  </div>
                  {!batch && (
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        active ? "text-primary" : "text-muted-foreground/60",
                      )}
                    >
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
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
              Batch is off — only the selected file will be processed.
            </p>
          )}
        </div>
      )}
      {big && (
        <div className="mt-3">
          <Note tone="warn">
            Files over ~1.5 GB may be too large for the in-browser engine's memory. The command will
            still work in desktop FFmpeg.
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
            {...(desc[f] ? { desc: desc[f] } : {})}
            {...(i === 0 ? { badge: "Recommended" } : {})}
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
  const names = {
    high: "Near-original",
    balanced: "Balanced",
    small: "Smaller file",
    tiny: "Smallest",
  };
  return (
    <div>
      <StepHeading
        eyebrow="Step · Quality"
        title="How should quality and size trade off?"
        desc="FFmpeg uses a quality target (CRF) rather than a fixed size, so every file gets the bits it actually needs."
      />
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
        {levels.map((l) => (
          <OptionCard
            key={l.v}
            selected={s.quality.level === l.v}
            onClick={() =>
              upd((x) => ({ ...x, quality: { ...x.quality, enabled: true, level: l.v } }))
            }
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
            onClick={() =>
              upd((x) => ({ ...x, quality: { ...x.quality, enabled: true, speed: sp.v } }))
            }
            title={sp.t}
            desc={sp.d}
          />
        ))}
      </div>
      <div className="mt-4">
        <Note>
          In-browser encoding is slower than desktop FFmpeg. “Quick” is a good pick for long videos.
        </Note>
      </div>
    </div>
  );
}

export function ResizeStep({ s, upd }: { s: Settings; upd: Upd }) {
  if (s.operation === "gif") {
    return (
      <div>
        <StepHeading
          eyebrow="Step · Size"
          title="Size and smoothness"
          desc="Smaller and fewer frames keep GIFs light enough to share."
        />
        <div className="space-y-6 rounded-2xl border bg-card p-5">
          <Field label="Width" hint={`${s.gif.width}px`}>
            <Slider
              min={160}
              max={1080}
              step={20}
              value={[s.gif.width]}
              onValueChange={([v]) =>
                upd((x) => ({
                  ...x,
                  resize: { ...x.resize, enabled: true },
                  gif: { ...x.gif, width: v ?? x.gif.width },
                }))
              }
            />
          </Field>
          <Field label="Frames per second" hint={`${s.gif.fps} fps`}>
            <Slider
              min={5}
              max={30}
              step={1}
              value={[s.gif.fps]}
              onValueChange={([v]) =>
                upd((x) => ({ ...x, gif: { ...x.gif, fps: v ?? x.gif.fps } }))
              }
            />
          </Field>
        </div>
      </div>
    );
  }
  const opts: { v: ResizePreset; t: string; d: string; icon: ReactNode; badge?: string }[] = [
    {
      v: "vertical",
      t: "Vertical 9:16",
      d: "TikTok, Reels, Shorts, Stories · 1080×1920",
      icon: <RectangleVertical className="size-4" />,
      badge: "Social",
    },
    {
      v: "square",
      t: "Square 1:1",
      d: "Instagram & LinkedIn feed · 1080×1080",
      icon: <Square className="size-4" />,
    },
    {
      v: "1080p",
      t: "1080p",
      d: "Full HD, keeps the original shape",
      icon: <Maximize2 className="size-4" />,
    },
    {
      v: "720p",
      t: "720p",
      d: "HD — a great size/quality balance",
      icon: <Maximize2 className="size-4" />,
    },
    {
      v: "480p",
      t: "480p",
      d: "Small screens and quick previews",
      icon: <Minimize2 className="size-4" />,
    },
    {
      v: "custom",
      t: "Custom size",
      d: "Set exact width and height",
      icon: <Wand2 className="size-4" />,
    },
  ];
  return (
    <div>
      <StepHeading
        eyebrow="Step · Size"
        title="Resize or reframe?"
        desc="Social formats crop from the centre so nothing gets squashed."
      />
      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
        {opts.map((o) => (
          <OptionCard
            key={o.v}
            selected={s.resize.enabled && s.resize.preset === o.v}
            onClick={() =>
              upd((x) => ({ ...x, resize: { ...x.resize, enabled: true, preset: o.v } }))
            }
            icon={o.icon}
            title={o.t}
            desc={o.d}
            {...(o.badge ? { badge: o.badge } : {})}
          />
        ))}
      </div>
      {s.resize.enabled && s.resize.preset === "custom" && (
        <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
          <Field label="Width (px)">
            <Input
              type="number"
              min={16}
              max={7680}
              value={s.resize.width}
              onChange={(e) =>
                upd((x) => ({ ...x, resize: { ...x.resize, width: Number(e.target.value) || 0 } }))
              }
            />
          </Field>
          <Field label="Height (px)">
            <Input
              type="number"
              min={16}
              max={4320}
              value={s.resize.height}
              onChange={(e) =>
                upd((x) => ({ ...x, resize: { ...x.resize, height: Number(e.target.value) || 0 } }))
              }
            />
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
      <StepHeading
        eyebrow="Step · Trim"
        title="Keep only part of it?"
        desc="Use hours:minutes:seconds, or just seconds. Leave the end empty to go to the finish."
      />
      <div className="grid max-w-md grid-cols-2 gap-3 rounded-2xl border bg-card p-5">
        <Field label="Start">
          <Input
            value={s.trim.start}
            aria-invalid={!startOk}
            onChange={(e) =>
              upd((x) => ({ ...x, trim: { ...x.trim, enabled: true, start: e.target.value } }))
            }
            placeholder="00:00:00"
            className="font-mono"
          />
        </Field>
        <Field label="End">
          <Input
            value={s.trim.end}
            aria-invalid={!endOk}
            onChange={(e) =>
              upd((x) => ({ ...x, trim: { ...x.trim, enabled: true, end: e.target.value } }))
            }
            placeholder="end of file"
            className="font-mono"
          />
        </Field>
        {(!startOk || !endOk) && (
          <p className="col-span-2 text-xs text-destructive">
            Times look like 00:01:30, 1:30 or 90.
          </p>
        )}
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
            onClick={() =>
              upd((x) => ({
                ...x,
                trim: { enabled: true, start: a ?? x.trim.start, end: b ?? x.trim.end },
              }))
            }
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
      <StepHeading
        eyebrow="Step · Audio"
        title="What about the sound?"
        desc="Keep it as is, even out the volume, or remove it entirely."
      />
      <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup">
        <OptionCard
          selected={s.audio.mode === "keep"}
          onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, mode: "keep" } }))}
          icon={<Volume2 className="size-4" />}
          title="Keep audio"
          desc="Re-encode at a sensible bitrate"
        />
        <OptionCard
          selected={s.audio.mode === "normalize"}
          onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, mode: "normalize" } }))}
          icon={<AudioLines className="size-4" />}
          title="Even out volume"
          desc="Loudness normalisation"
        />
        {!audioOnly && (
          <OptionCard
            selected={s.audio.mode === "remove"}
            onClick={() => upd((x) => ({ ...x, audio: { ...x.audio, mode: "remove" } }))}
            icon={<VolumeX className="size-4" />}
            title="Remove audio"
            desc="Silent output"
          />
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

export function SubtitlesStep({
  s,
  upd,
  sub,
  setSub,
}: {
  s: Settings;
  upd: Upd;
  sub: File | null;
  setSub: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const desktop = useIsDesktopApp();
  const choose = async () => {
    if (!desktop) return ref.current?.click();
    try {
      const path = await chooseNativeSubtitle();
      if (!path) return;
      const file = new File([], path.split("/").pop() || "subtitles.srt");
      Object.assign(file, { nativePath: path });
      setSub(file);
      upd((x) => ({ ...x, subtitles: { ...x.subtitles, enabled: true } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not choose that subtitle file.");
    }
  };
  return (
    <div>
      <StepHeading
        eyebrow="Step · Subtitles"
        title="Add a subtitle file"
        desc="Pick an .srt, .vtt or .ass file. It'll be applied to every video in the batch."
      />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <Button variant="outline" onClick={choose}>
          <Captions className="size-4" /> {sub ? "Replace file" : "Choose subtitle file"}
        </Button>
        {sub ? (
          <span className="flex items-center gap-2 text-sm">
            {sub.name}{" "}
            <span className="text-xs text-muted-foreground">
              {(sub as File & { nativePath?: string }).nativePath
                ? "On this Mac"
                : formatBytes(sub.size)}
            </span>
            <button
              type="button"
              aria-label="Remove subtitle file"
              onClick={() => setSub(null)}
              className="text-muted-foreground hover:text-destructive"
            >
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
        <OptionCard
          selected={s.subtitles.mode === "soft"}
          onClick={() =>
            upd((x) => ({ ...x, subtitles: { ...x.subtitles, enabled: true, mode: "soft" } }))
          }
          title="Switchable track"
          desc="Viewers can turn captions on/off. Fast — no re-drawing."
          badge="Recommended"
        />
        <OptionCard
          selected={s.subtitles.mode === "burn"}
          onClick={() =>
            upd((x) => ({ ...x, subtitles: { ...x.subtitles, enabled: true, mode: "burn" } }))
          }
          title="Burn into picture"
          desc="Always visible, works on every platform."
        />
      </div>
      {s.subtitles.mode === "burn" && (
        <div className="mt-3">
          <Note tone="warn">
            Burning in needs fonts. The in-browser engine ships without system fonts, so this may
            fail here — the command works in desktop FFmpeg.
          </Note>
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
  const desktop = useIsDesktopApp();
  const supported = desktop || canWriteFolders();
  const preview = names.length ? outputNames(names, s) : outputNames(["my-video.mp4"], s);
  return (
    <div>
      <StepHeading
        eyebrow="Step · Output"
        title="Name it and choose where it goes"
        desc="Originals are never touched — Framewise always writes new files."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <Field label="Add to the end of each name" hint="optional">
            <Input
              value={s.output.suffix}
              onChange={(e) => upd((x) => ({ ...x, output: { suffix: e.target.value } }))}
              placeholder="-compressed"
            />
          </Field>
          <div className="mt-4 text-xs font-semibold">Preview</div>
          <ul className="mt-1.5 max-h-40 space-y-1 overflow-auto font-mono text-xs">
            {preview.slice(0, 8).map((n, i) => (
              <li key={i} className="truncate rounded-md bg-muted px-2 py-1">
                {n}
              </li>
            ))}
            {preview.length > 8 && (
              <li className="text-muted-foreground">+ {preview.length - 8} more</li>
            )}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Duplicate names get -2, -3… so nothing is overwritten within a batch.
          </p>
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
          className={cn(
            "flex flex-col rounded-2xl border bg-card p-5 transition-all",
            over && "border-primary bg-secondary/60",
          )}
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
                      <div className="text-[11px] text-muted-foreground">
                        Finished files are saved straight here
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">Downloads</div>
                      <div className="text-[11px] text-muted-foreground">
                        Or drop a folder here / choose one
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (desktop) {
                      try {
                        const path = await chooseNativeOutputFolder();
                        if (path)
                          setDir({ name: path.split("/").filter(Boolean).pop() || path, path });
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not choose that folder.",
                        );
                      }
                    } else {
                      setDir(await pickDirectory());
                    }
                  }}
                >
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
                  <div className="text-[11px] text-muted-foreground">
                    Each finished file gets a download button
                  </div>
                </div>
              </div>
              <Note>
                This browser can't write directly into folders. Chrome or Edge on desktop can —
                everywhere else, files download instead.
              </Note>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
