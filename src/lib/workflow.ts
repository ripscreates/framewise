export type Operation =
  | "compress"
  | "convert"
  | "trim"
  | "extract-audio"
  | "resize"
  | "subtitles"
  | "gif";

export type StepId =
  | "goal"
  | "files"
  | "format"
  | "quality"
  | "resize"
  | "trim"
  | "audio"
  | "subtitles"
  | "output"
  | "review";

export type QualityLevel = "high" | "balanced" | "small" | "tiny";
export type Speed = "fast" | "balanced" | "thorough";
export type ResizePreset = "1080p" | "720p" | "480p" | "square" | "vertical" | "custom";

export interface Settings {
  operation: Operation;
  format: string;
  quality: { enabled: boolean; level: QualityLevel; speed: Speed };
  resize: { enabled: boolean; preset: ResizePreset; width: number; height: number };
  trim: { enabled: boolean; start: string; end: string };
  audio: { mode: "keep" | "remove" | "normalize"; bitrate: string };
  subtitles: { enabled: boolean; mode: "burn" | "soft" };
  gif: { fps: number; width: number };
  output: { suffix: string };
}

export const VIDEO_FORMATS = ["mp4", "webm", "mov", "mkv"] as const;
export const AUDIO_FORMATS = ["mp3", "m4a", "wav", "ogg"] as const;

export const OPERATIONS: Record<
  Operation,
  { label: string; blurb: string; defaultFormat: string; steps: StepId[] }
> = {
  compress: {
    label: "Compress a video",
    blurb: "Make files smaller for sharing or email",
    defaultFormat: "mp4",
    steps: ["goal", "files", "quality", "resize", "trim", "audio", "output", "review"],
  },
  convert: {
    label: "Convert a format",
    blurb: "Change MOV, MKV, WebM or MP4 into another",
    defaultFormat: "mp4",
    steps: ["goal", "files", "format", "quality", "resize", "trim", "audio", "subtitles", "output", "review"],
  },
  trim: {
    label: "Trim a clip",
    blurb: "Keep just the part you need",
    defaultFormat: "mp4",
    steps: ["goal", "files", "trim", "format", "quality", "audio", "output", "review"],
  },
  "extract-audio": {
    label: "Extract audio",
    blurb: "Pull the soundtrack out as MP3, WAV and more",
    defaultFormat: "mp3",
    steps: ["goal", "files", "format", "trim", "audio", "output", "review"],
  },
  resize: {
    label: "Resize for social",
    blurb: "Vertical, square or smaller resolutions",
    defaultFormat: "mp4",
    steps: ["goal", "files", "resize", "quality", "trim", "audio", "output", "review"],
  },
  subtitles: {
    label: "Add subtitles",
    blurb: "Attach or burn in an .srt or .vtt file",
    defaultFormat: "mp4",
    steps: ["goal", "files", "subtitles", "format", "quality", "output", "review"],
  },
  gif: {
    label: "Make a GIF",
    blurb: "Turn a short moment into a looping GIF",
    defaultFormat: "gif",
    steps: ["goal", "files", "trim", "resize", "output", "review"],
  },
};

export const STEP_META: Record<StepId, { label: string; skippable: boolean }> = {
  goal: { label: "Goal", skippable: false },
  files: { label: "Files", skippable: false },
  format: { label: "Format", skippable: true },
  quality: { label: "Quality", skippable: true },
  resize: { label: "Size", skippable: true },
  trim: { label: "Trim", skippable: true },
  audio: { label: "Audio", skippable: true },
  subtitles: { label: "Subtitles", skippable: true },
  output: { label: "Output", skippable: true },
  review: { label: "Review", skippable: false },
};

export function defaultSettings(operation: Operation = "compress"): Settings {
  return {
    operation,
    format: OPERATIONS[operation].defaultFormat,
    quality: { enabled: operation === "compress", level: operation === "compress" ? "small" : "balanced", speed: "balanced" },
    resize: {
      enabled: operation === "resize" || operation === "gif",
      preset: operation === "resize" ? "vertical" : "480p",
      width: 1280,
      height: 720,
    },
    trim: { enabled: operation === "trim" || operation === "gif", start: "00:00:00", end: operation === "gif" ? "00:00:05" : "00:00:30" },
    audio: { mode: "keep", bitrate: operation === "extract-audio" ? "192k" : "128k" },
    subtitles: { enabled: operation === "subtitles", mode: "soft" },
    gif: { fps: 12, width: 480 },
    output: { suffix: operation === "gif" ? "" : `-${operation === "extract-audio" ? "audio" : operation}` },
  };
}

export function isAudioFormat(f: string) {
  return (AUDIO_FORMATS as readonly string[]).includes(f);
}

export function effectiveFormat(s: Settings) {
  if (s.operation === "gif") return "gif";
  if (s.operation === "extract-audio") return isAudioFormat(s.format) ? s.format : "mp3";
  return (VIDEO_FORMATS as readonly string[]).includes(s.format) ? s.format : "mp4";
}

const CRF_X264: Record<QualityLevel, number> = { high: 18, balanced: 23, small: 28, tiny: 32 };
const CRF_VP9: Record<QualityLevel, number> = { high: 24, balanced: 31, small: 36, tiny: 42 };
const PRESET_X264: Record<Speed, string> = { fast: "veryfast", balanced: "medium", thorough: "slow" };
const CPU_VP9: Record<Speed, string> = { fast: "5", balanced: "3", thorough: "1" };

export const QUALITY_LABEL: Record<QualityLevel, string> = {
  high: "Near-original",
  balanced: "Balanced",
  small: "Smaller file",
  tiny: "Smallest",
};

export function resizeFilter(s: Settings): string | null {
  if (!s.resize.enabled) return null;
  switch (s.resize.preset) {
    case "1080p":
      return "scale=-2:1080";
    case "720p":
      return "scale=-2:720";
    case "480p":
      return "scale=-2:480";
    case "square":
      return "crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080";
    case "vertical":
      return "crop=ih*9/16:ih,scale=1080:1920";
    case "custom": {
      const w = Math.max(2, Math.round(s.resize.width / 2) * 2);
      const h = Math.max(2, Math.round(s.resize.height / 2) * 2);
      return `scale=${w}:${h}`;
    }
  }
}

/** Escape a filename for use inside an FFmpeg filter argument (e.g. subtitles=...). */
export function escapeFilterValue(v: string) {
  // Level 1: option value escaping. Level 2: filtergraph escaping.
  const lvl1 = v.replace(/[\\':]/g, (c) => "\\" + c);
  return lvl1.replace(/[\\',;[\]]/g, (c) => "\\" + c);
}

/** Quote one argument for a POSIX shell. */
export function shellQuote(arg: string) {
  if (arg === "") return "''";
  if (/^[A-Za-z0-9_\-.,:/=+@%^]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export const TIME_RE = /^(\d{1,2}:)?(\d{1,2}:)?\d{1,2}(\.\d+)?$/;
export function isValidTime(t: string) {
  return TIME_RE.test(t.trim());
}
export function timeToSeconds(t: string) {
  return t
    .trim()
    .split(":")
    .reduce((acc, part) => acc * 60 + parseFloat(part || "0"), 0);
}

export interface CommandPart {
  tokens: string[];
  explain: string;
}

export interface BuildInput {
  input: string;
  output: string;
  subtitle?: string;
}

export function buildCommand(s: Settings, io: BuildInput): CommandPart[] {
  const parts: CommandPart[] = [];
  const fmt = effectiveFormat(s);
  parts.push({ tokens: ["-hide_banner", "-y"], explain: "Keep the log tidy and overwrite an existing output of the same name." });
  parts.push({ tokens: ["-i", io.input], explain: `Read the source file “${io.input}”.` });

  const hasSub = s.subtitles.enabled && !!io.subtitle && fmt !== "gif" && !isAudioFormat(fmt);
  const softSub = hasSub && s.subtitles.mode === "soft";
  const burnSub = hasSub && s.subtitles.mode === "burn";
  if (softSub) parts.push({ tokens: ["-i", io.subtitle!], explain: `Also read the subtitle file “${io.subtitle}”.` });

  if (s.trim.enabled) {
    const t: string[] = [];
    const start = s.trim.start.trim();
    const end = s.trim.end.trim();
    if (start && timeToSeconds(start) > 0) t.push("-ss", start);
    if (end) t.push("-to", end);
    if (t.length)
      parts.push({
        tokens: t,
        explain: `Keep only ${start && timeToSeconds(start) > 0 ? `from ${start}` : "from the start"}${end ? ` to ${end}` : " to the end"}.`,
      });
  }

  if (fmt === "gif") {
    const vf = `fps=${s.gif.fps},scale=${s.resize.enabled ? s.gif.width : -1}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    parts.push({
      tokens: ["-vf", vf],
      explain: `Sample ${s.gif.fps} frames per second${s.resize.enabled ? `, scale to ${s.gif.width}px wide` : ""}, and build a custom colour palette so the GIF looks crisp.`,
    });
    parts.push({ tokens: ["-loop", "0"], explain: "Loop the GIF forever." });
    parts.push({ tokens: [io.output], explain: `Save the result as “${io.output}”.` });
    return parts;
  }

  if (isAudioFormat(fmt)) {
    parts.push({ tokens: ["-vn"], explain: "Drop the video picture — keep sound only." });
    const codec: Record<string, string[]> = {
      mp3: ["-c:a", "libmp3lame"],
      m4a: ["-c:a", "aac"],
      wav: ["-c:a", "pcm_s16le"],
      ogg: ["-c:a", "libvorbis"],
    };
    parts.push({
      tokens: codec[fmt],
      explain: fmt === "wav" ? "Write uncompressed WAV audio (largest, lossless)." : `Encode the audio as ${fmt.toUpperCase()}.`,
    });
    if (fmt !== "wav")
      parts.push({ tokens: ["-b:a", s.audio.bitrate], explain: `Use ${s.audio.bitrate}bps audio — higher sounds better, lower is smaller.` });
    if (s.audio.mode === "normalize")
      parts.push({ tokens: ["-af", "loudnorm"], explain: "Even out loudness to a standard broadcast level." });
    parts.push({ tokens: [io.output], explain: `Save the result as “${io.output}”.` });
    return parts;
  }

  const filters: string[] = [];
  const rf = resizeFilter(s);
  if (rf) filters.push(rf);
  if (burnSub) filters.push(`subtitles=${escapeFilterValue(io.subtitle!)}`);
  if (filters.length) {
    const what: string[] = [];
    if (rf) what.push(describeResize(s));
    if (burnSub) what.push("burn the subtitles permanently into the picture");
    parts.push({ tokens: ["-vf", filters.join(",")], explain: capitalize(what.join(", then ")) + "." });
  }

  if (softSub) {
    parts.push({
      tokens: ["-map", "0:v:0", "-map", "0:a?", "-map", "1:0"],
      explain: "Take the video and any audio from the first file and the subtitle track from the second.",
    });
  }

  const level = s.quality.enabled ? s.quality.level : "balanced";
  const speed = s.quality.enabled ? s.quality.speed : "balanced";
  if (fmt === "webm") {
    parts.push({
      tokens: ["-c:v", "libvpx-vp9", "-crf", String(CRF_VP9[level]), "-b:v", "0", "-deadline", "good", "-cpu-used", CPU_VP9[speed], "-row-mt", "1"],
      explain: `Encode video as VP9 at “${QUALITY_LABEL[level]}” quality (CRF ${CRF_VP9[level]}; lower numbers look better but are bigger).`,
    });
  } else {
    parts.push({
      tokens: ["-c:v", "libx264", "-crf", String(CRF_X264[level]), "-preset", PRESET_X264[speed], "-pix_fmt", "yuv420p"],
      explain: `Encode video as H.264 at “${QUALITY_LABEL[level]}” quality (CRF ${CRF_X264[level]}), ${PRESET_X264[speed]} speed, in the colour format every player supports.`,
    });
  }

  if (s.audio.mode === "remove") {
    parts.push({ tokens: ["-an"], explain: "Remove all audio — the result is silent." });
  } else {
    parts.push({
      tokens: ["-c:a", fmt === "webm" ? "libopus" : "aac", "-b:a", s.audio.bitrate],
      explain: `Encode audio as ${fmt === "webm" ? "Opus" : "AAC"} at ${s.audio.bitrate}bps.`,
    });
    if (s.audio.mode === "normalize")
      parts.push({ tokens: ["-af", "loudnorm"], explain: "Even out loudness to a standard broadcast level." });
  }

  if (softSub) {
    const sc = fmt === "mkv" ? "srt" : fmt === "webm" ? "webvtt" : "mov_text";
    parts.push({ tokens: ["-c:s", sc], explain: "Store subtitles as a track viewers can switch on or off." });
  }

  if (fmt === "mp4" || fmt === "mov")
    parts.push({ tokens: ["-movflags", "+faststart"], explain: "Put playback info at the front so it starts instantly online." });

  parts.push({ tokens: [io.output], explain: `Save the result as “${io.output}”.` });
  return parts;
}

export function commandArgs(parts: CommandPart[]) {
  return parts.flatMap((p) => p.tokens);
}

export function toShell(parts: CommandPart[]) {
  return ["ffmpeg", ...commandArgs(parts)].map(shellQuote).join(" ");
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function describeResize(s: Settings) {
  switch (s.resize.preset) {
    case "1080p":
      return "resize to 1080 pixels tall, keeping the shape";
    case "720p":
      return "resize to 720 pixels tall, keeping the shape";
    case "480p":
      return "resize to 480 pixels tall, keeping the shape";
    case "square":
      return "crop the centre to a square and size it to 1080×1080";
    case "vertical":
      return "crop the centre to a 9:16 vertical frame and size it to 1080×1920";
    case "custom":
      return `resize to exactly ${s.resize.width}×${s.resize.height}`;
  }
}

export function splitName(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? { base: name.slice(0, i), ext: name.slice(i + 1) } : { base: name, ext: "" };
}

/** Produce unique, safe output names for a batch. */
export function outputNames(inputs: string[], s: Settings): string[] {
  const fmt = effectiveFormat(s);
  const used = new Set<string>();
  const suffix = s.output.suffix.replace(/[\\/:*?"<>|]/g, "");
  return inputs.map((name) => {
    const { base } = splitName(name);
    const cleanBase = base.replace(/[\\/:*?"<>|]/g, "_") || "output";
    let candidate = `${cleanBase}${suffix}.${fmt}`;
    if (candidate.toLowerCase() === name.toLowerCase()) candidate = `${cleanBase}-framewise.${fmt}`;
    let n = 2;
    const stem = candidate.slice(0, -(fmt.length + 1));
    while (used.has(candidate.toLowerCase())) candidate = `${stem}-${n++}.${fmt}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export function summarize(s: Settings) {
  const fmt = effectiveFormat(s);
  const bits = [OPERATIONS[s.operation].label, `→ ${fmt.toUpperCase()}`];
  if (s.quality.enabled && !isAudioFormat(fmt) && fmt !== "gif") bits.push(QUALITY_LABEL[s.quality.level]);
  if (s.resize.enabled && fmt !== "gif" && !isAudioFormat(fmt)) bits.push(s.resize.preset);
  if (s.trim.enabled) bits.push(`${s.trim.start}–${s.trim.end || "end"}`);
  if (s.audio.mode !== "keep") bits.push(`audio: ${s.audio.mode}`);
  return bits.join(" · ");
}
