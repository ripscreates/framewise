import { createFileRoute } from "@tanstack/react-router";
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
  ["Is the guide an AI?", "The guide uses simple keyword matching that runs locally. It suggests a starting point and presets; it doesn't contact any AI service."],
  ["Why is it slower than desktop FFmpeg?", "The browser engine runs single-threaded. For long or 4K videos, copy the command and run it in desktop FFmpeg instead."],
  ["Can it save straight into a folder?", "In Chrome and Edge on desktop, yes. Other browsers download each finished file."],
  ["Why do I re-add files when repeating?", "Browsers don't let sites keep access to your files, so History stores the settings and you pick the files again."],
];

function Help() {
  return (
    <div>
      <TopBar title="Help & how it works" />
      <div className="max-w-2xl space-y-3 px-5 py-6 md:px-8">
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
