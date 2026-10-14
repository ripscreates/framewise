import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { TopBar } from "@/components/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — Framewise" },
      { name: "description", content: "How Framewise builds FFmpeg commands and converts files in your browser." },
      { property: "og:title", content: "Help — Framewise" },
      { property: "og:description", content: "How the guide, the in-browser engine and history work." },
    ],
  }),
  component: Help,
});

const QA = [
  ["Is my video uploaded anywhere?", "No. Files are read and converted inside this browser tab using FFmpeg compiled to WebAssembly. Only the engine itself (~31 MB) is downloaded from a public CDN."],
  ["How does the guide work?", "It uses local keyword matching to suggest a supported workflow and presets. It doesn't contact an AI service or require an API key."],
  ["Can Framewise do every FFmpeg task?", "The wizard currently covers common tasks listed above. FFmpeg supports many more formats, codecs and filters; the official references below describe the full toolkit."],
  ["Why is it slower than desktop FFmpeg?", "The browser engine runs single-threaded. For long or 4K videos, copy the command and run it in desktop FFmpeg instead."],
  ["Can it save straight into a folder?", "In Chrome and Edge on desktop, yes. Other browsers download each finished file."],
  ["Why do I re-add files when repeating?", "Browsers don't let sites keep access to your files, so History stores the settings and you pick the files again."],
];

const CAPABILITIES = [
  ["Compress or convert", "Make video files smaller, or switch between MP4, WebM, MOV and MKV."],
  ["Trim a clip", "Keep the opening, the ending, or a time range."],
  ["Extract audio", "Save the soundtrack as MP3, M4A, WAV or OGG."],
  ["Resize for social", "Choose a vertical or square crop, or a smaller resolution."],
  ["Add subtitles", "Attach a switchable subtitle track or burn captions into the picture."],
  ["Make a GIF", "Turn a short section into a looping GIF."],
];

const REFERENCES = [
  ["FFmpeg command line", "Inputs, outputs, stream selection and command options.", "https://ffmpeg.org/ffmpeg.html"],
  ["Filters", "Video and audio filters, including scale, crop, subtitles, loudness and GIF palettes.", "https://ffmpeg.org/ffmpeg-filters.html"],
  ["Codecs", "The encoders and decoders available in FFmpeg builds.", "https://ffmpeg.org/ffmpeg-codecs.html"],
  ["Formats", "Containers and media formats supported by FFmpeg.", "https://ffmpeg.org/ffmpeg-formats.html"],
];

function Help() {
  return (
    <div>
      <TopBar title="Help & how it works" />
      <div className="max-w-2xl space-y-3 px-5 py-6 md:px-8">
        <section className="surface-card p-5">
          <h2 className="text-base font-semibold">What Framewise can help with</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            These common workflows are built into the step-by-step guide. Each one creates an FFmpeg command you can review before running.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CAPABILITIES.map(([title, description]) => (
              <li key={title} className="rounded-xl border bg-card p-3">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface-card p-5">
          <h2 className="text-base font-semibold">Explore the official FFmpeg documentation</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Framewise covers a focused set of tasks; these references explain the wider FFmpeg toolkit.
          </p>
          <ul className="mt-3 space-y-2">
            {REFERENCES.map(([title, description, href]) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3 hover:border-primary/40">
                  <span>
                    <span className="block text-sm font-semibold text-primary">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </section>
        {QA.map(([q, a]) => (
          <div key={q} className="surface-card p-5">
            <h2 className="text-base font-semibold">{q}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
