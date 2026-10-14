import { defaultSettings, OPERATIONS, type Operation, type Settings } from "./workflow";

export interface IntentMatch {
  operation: Operation;
  matched: string[];
  reply: string;
  settings: Settings;
  confident: boolean;
}

const RULES: { op: Operation; words: RegExp[] }[] = [
  { op: "gif", words: [/\bgifs?\b/, /\bloop(ing)?\b/, /\bmeme\b/, /\breaction\b/] },
  { op: "extract-audio", words: [/\bextract\b.*\baudio\b/, /\baudio only\b/, /\bmp3\b/, /\bwav\b/, /\bsoundtrack\b/, /\bpodcast\b/, /\bmusic\b/, /\bm4a\b/, /\brip\b.*\b(audio|sound)\b/] },
  { op: "subtitles", words: [/\bsubtitles?\b/, /\bcaptions?\b/, /\bsrt\b/, /\bvtt\b/, /\bsubs\b/] },
  { op: "trim", words: [/\btrim\b/, /\bcut\b/, /\bclip\b/, /\bshorten\b/, /\bfirst \d+/, /\blast \d+/, /\bfrom \d/, /\bsnippet\b/, /\bexcerpt\b/] },
  { op: "resize", words: [/\bresize\b/, /\binstagram\b/, /\breels?\b/, /\btiktok\b/, /\bshorts\b/, /\bvertical\b/, /\bsquare\b/, /\bsocial\b/, /\b(720|1080|480)p?\b/, /\bcrop\b/, /\bstory\b/] },
  { op: "compress", words: [/\bcompress/, /\bsmaller\b/, /\bshrink\b/, /\breduce\b/, /\bemail\b/, /\bfile size\b/, /\btoo (big|large)\b/, /\bdiscord\b/, /\bwhatsapp\b/, /\bmb\b/, /\blighter\b/] },
  { op: "convert", words: [/\bconvert\b/, /\bchange\b.*\bformat\b/, /\bto (mp4|webm|mov|mkv)\b/, /\b(mov|mkv|avi|webm|mp4)\b/, /\bturn\b.*\binto\b/, /\bplay on\b/] },
];

function parseSeconds(n: string, unit?: string) {
  const v = parseFloat(n);
  return unit && /^m/.test(unit) ? v * 60 : v;
}
function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

export function matchIntent(text: string): IntentMatch | null {
  const q = text.toLowerCase().trim();
  if (!q) return null;
  let best: { op: Operation; hits: string[] } | null = null;
  for (const r of RULES) {
    const hits = r.words.map((w) => q.match(w)?.[0]).filter((x): x is string => !!x);
    if (hits.length && (!best || hits.length > best.hits.length)) best = { op: r.op, hits };
  }
  const op: Operation = best?.op ?? "convert";
  const s = defaultSettings(op);
  const notes: string[] = [];

  const fmt = q.match(/\b(?:to|as|into|in)\s+(?:an?\s+)?\.?(mp4|webm|mov|mkv|mp3|wav|m4a|ogg)\b/)?.[1];
  if (fmt) {
    s.format = fmt;
    notes.push(`output as ${fmt.toUpperCase()}`);
  }

  if (/\b(tiktok|reels?|shorts|vertical|story|stories)\b/.test(q)) {
    s.resize = { ...s.resize, enabled: true, preset: "vertical" };
    notes.push("a 9:16 vertical frame");
  } else if (/\bsquare\b|\binstagram post\b/.test(q)) {
    s.resize = { ...s.resize, enabled: true, preset: "square" };
    notes.push("a square 1:1 frame");
  } else {
    const res = q.match(/\b(1080|720|480)p?\b/)?.[1];
    if (res) {
      s.resize = { ...s.resize, enabled: true, preset: `${res}p` as Settings["resize"]["preset"] };
      notes.push(`${res}p resolution`);
    }
  }

  const first = q.match(/\bfirst (\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|m|min|mins|minutes?)?\b/);
  const range = q.match(/\bfrom (\d{1,2}:\d{2}(?::\d{2})?|\d+)\s*(?:s|sec|seconds?)?\s*(?:to|-|until)\s*(\d{1,2}:\d{2}(?::\d{2})?|\d+)/);
  if (first) {
    s.trim = { enabled: true, start: "00:00:00", end: fmtTime(parseSeconds(first[1], first[2])) };
    notes.push(`only the first ${first[1]}${first[2] && /^m/.test(first[2]) ? " min" : "s"}`);
  } else if (range) {
    const norm = (v: string) => (v.includes(":") ? v : fmtTime(parseFloat(v)));
    s.trim = { enabled: true, start: norm(range[1]), end: norm(range[2]) };
    notes.push(`the part from ${s.trim.start} to ${s.trim.end}`);
  }

  if (/\b(mute|silent|no (audio|sound)|remove (the )?(audio|sound))\b/.test(q) && op !== "extract-audio") {
    s.audio.mode = "remove";
    notes.push("no audio");
  } else if (/\b(normali[sz]e|louder|volume|even out)\b/.test(q)) {
    s.audio.mode = "normalize";
    notes.push("evened-out loudness");
  }
  if (/\bburn/.test(q) && op === "subtitles") {
    s.subtitles.mode = "burn";
    notes.push("subtitles burned into the picture");
  }
  if (op === "compress" && /\b(email|discord|whatsapp|tiny|as small)\b/.test(q)) {
    s.quality.level = "tiny";
    notes.push("an aggressive size target");
  }

  const label = OPERATIONS[op].label.toLowerCase();
  const why = best ? `because you mentioned “${best.hits.slice(0, 2).join("”, “")}”` : "as a flexible starting point, since I couldn't spot a specific task";
  const reply = best
    ? `This looks like a job to ${label}, ${why}.${notes.length ? ` I've pre-set ${notes.join(", ")}.` : ""} Next, add the files you want to work on.`
    : "I couldn't match that to a Framewise workflow yet. You can compress or convert video, trim a clip, extract audio, resize for social, add subtitles, or make a GIF. Choose a starting point below, or open Help for official FFmpeg references.";
  return { operation: op, matched: best?.hits ?? [], reply, settings: s, confident: !!best };
}
