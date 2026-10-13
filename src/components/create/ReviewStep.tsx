import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, FileCode2, Loader2, Play, Square, XCircle, FolderCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { addHistory, formatBytes, type RunStatus } from "@/lib/history";
import { downloadBlob, writeToDir, type DirHandle, type QueuedFile } from "@/lib/files";
import { runJob, useEngine } from "@/lib/engine";
import {
  buildCommand,
  commandArgs,
  isValidTime,
  OPERATIONS,
  outputNames,
  shellQuote,
  toShell,
  type Settings,
} from "@/lib/workflow";
import { StepHeading, Note } from "./ui";

interface FileResult {
  state: "waiting" | "running" | "done" | "failed";
  progress: number;
  blob?: Blob;
  error?: string;
  saved?: boolean;
}

export function useCommands(s: Settings, files: QueuedFile[], sub: File | null) {
  return useMemo(() => {
    const inputs = files.length ? files.map((f) => f.file.name) : [s.operation === "extract-audio" ? "input.mp4" : "input.mp4"];
    const outs = outputNames(inputs, s);
    return inputs.map((input, i) => ({
      input,
      output: outs[i],
      parts: buildCommand(s, { input, output: outs[i], subtitle: s.subtitles.enabled ? sub?.name || "subtitles.srt" : undefined }),
    }));
  }, [s, files, sub]);
}

export function CommandBlock({ text }: { text: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-ink p-4 font-mono text-[12.5px] leading-relaxed text-ink-foreground">
      <span className="select-none text-electric">$ </span>
      {text}
    </pre>
  );
}

export function ReviewStep({
  s,
  files,
  sub,
  dir,
  onEdit,
}: {
  s: Settings;
  files: QueuedFile[];
  sub: File | null;
  dir: DirHandle | null;
  onEdit: (step: "files" | "trim" | "subtitles") => void;
}) {
  const engine = useEngine();
  const cmds = useCommands(s, files, sub);
  const [which, setWhich] = useState(0);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<{ status: RunStatus; ms: number } | null>(null);
  const cancelRef = useRef(false);
  const cur = cmds[Math.min(which, cmds.length - 1)];
  const shell = toShell(cur.parts);

  const blockers: { msg: string; fix?: "files" | "trim" | "subtitles" }[] = [];
  if (!files.length) blockers.push({ msg: "Add at least one file to run in the browser.", fix: "files" });
  if (s.trim.enabled && ((s.trim.start && !isValidTime(s.trim.start)) || (s.trim.end && !isValidTime(s.trim.end))))
    blockers.push({ msg: "The trim times aren't valid.", fix: "trim" });
  if (s.subtitles.enabled && !sub && s.operation !== "gif" && s.operation !== "extract-audio")
    blockers.push({ msg: "Choose a subtitle file, or skip subtitles.", fix: "subtitles" });
  if (engine.status === "unsupported") blockers.push({ msg: engine.message });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Command copied");
    } catch {
      toast.error("Couldn't access the clipboard — select the command and copy it manually.");
    }
  };

  const script = () => {
    const lines = ["#!/bin/sh", `# Framewise — ${OPERATIONS[s.operation].label}`, "# Run this in the folder that contains your files.", "set -e", ""];
    cmds.forEach((c) => lines.push(toShell(c.parts)));
    downloadBlob(new Blob([lines.join("\n") + "\n"], { type: "text/x-shellscript" }), "framewise-commands.sh");
  };

  const run = async () => {
    setRunning(true);
    setSummary(null);
    setLog([]);
    cancelRef.current = false;
    const started = Date.now();
    setResults(files.map(() => ({ state: "waiting", progress: 0 })));
    const patch = (i: number, p: Partial<FileResult>) => setResults((r) => (r ? r.map((x, j) => (j === i ? { ...x, ...p } : x)) : r));
    let res: Awaited<ReturnType<typeof runJob>> = [];
    let fatal: string | undefined;
    try {
      res = await runJob(
        files.map((f, i) => ({
          file: f.file,
          outputName: cmds[i].output,
          args: (input, output, subtitle) =>
            commandArgs(buildCommand(s, { input, output, subtitle: s.subtitles.enabled ? subtitle : undefined })),
        })),
        s.subtitles.enabled ? sub : null,
        {
          onFileStart: (i) => patch(i, { state: "running", progress: 0 }),
          onProgress: (i, p) => patch(i, { progress: p }),
          onLog: (line) => setLog((l) => [...l.slice(-300), line]),
        },
      );
    } catch (e) {
      fatal = e instanceof Error ? e.message : "The engine couldn't start.";
    }
    for (const r of res) {
      let saved = false;
      let error = r.error;
      if (r.ok && r.blob && dir) {
        try {
          await writeToDir(dir, cmds[r.index].output, r.blob);
          saved = true;
        } catch (e) {
          error = `Converted, but couldn't save to the folder: ${e instanceof Error ? e.message : e}. Use download instead.`;
        }
      }
      patch(r.index, { state: r.ok ? "done" : "failed", progress: r.ok ? 1 : 0, blob: r.blob, error, saved });
    }
    if (fatal) setResults((rs) => rs?.map((x) => ({ ...x, state: "failed", error: fatal })) ?? null);
    const ok = res.filter((r) => r.ok).length;
    const status: RunStatus = fatal || ok === 0 ? "failed" : ok === files.length ? "success" : "partial";
    const ms = Date.now() - started;
    setSummary({ status, ms });
    addHistory({
      id: `${started.toString(36)}${Math.floor(started % 997).toString(36)}`,
      name: `${OPERATIONS[s.operation].label} — ${files[0].file.name}${files.length > 1 ? ` +${files.length - 1}` : ""}`,
      date: new Date(started).toISOString(),
      settings: s,
      files: files.map((f) => ({ name: f.path, size: f.file.size })),
      outputs: res.filter((r) => r.ok).map((r) => cmds[r.index].output),
      command: toShell(cmds[0].parts),
      status,
      destination: dir ? "folder" : "download",
      durationMs: ms,
      error: fatal ?? res.find((r) => !r.ok)?.error,
    });
    setRunning(false);
    if (status === "success") toast.success(`Converted ${ok} file${ok > 1 ? "s" : ""} in your browser`);
    else if (status === "partial") toast.warning(`${ok} of ${files.length} files converted`);
    else toast.error("The conversion didn't finish — check the log below.");
  };

  return (
    <div>
      <StepHeading eyebrow="Step · Review" title="Here's your FFmpeg command" desc="Every part is explained below. Copy it for desktop FFmpeg, or run it right here in your browser." />

      {cmds.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Showing command for</span>
          <select
            value={which}
            onChange={(e) => setWhich(Number(e.target.value))}
            className="rounded-lg border bg-card px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {cmds.map((c, i) => (
              <option key={i} value={i}>
                {c.input}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">· same settings for all {cmds.length} files</span>
        </div>
      )}

      <CommandBlock text={shell} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => copy(shell)}>
          <Copy className="size-4" /> Copy command
        </Button>
        {cmds.length > 1 && (
          <Button variant="outline" onClick={() => copy(cmds.map((c) => toShell(c.parts)).join("\n"))}>
            <Copy className="size-4" /> Copy all {cmds.length}
          </Button>
        )}
        <Button variant="outline" onClick={script}>
          <FileCode2 className="size-4" /> Download script
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold">What each part does</div>
        <ol className="divide-y">
          <li className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-4">
            <code className="w-full shrink-0 font-mono text-xs text-primary sm:w-56">ffmpeg</code>
            <span className="text-sm text-muted-foreground">Start FFmpeg, the open-source media toolkit.</span>
          </li>
          {cur.parts.map((p, i) => (
            <li key={i} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-4">
              <code className="w-full shrink-0 break-all font-mono text-xs text-primary sm:w-56">{p.tokens.map(shellQuote).join(" ")}</code>
              <span className="text-sm text-muted-foreground">{p.explain}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Run in this browser</h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Uses FFmpeg compiled to WebAssembly, locally in this tab. Nothing is uploaded. It's slower than desktop FFmpeg, so keep this tab open.
            </p>
          </div>
          <Button variant="brand" size="lg" onClick={run} disabled={running || blockers.length > 0}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? (engine.status === "loading" ? "Loading engine…" : "Converting…") : `Run on ${files.length || 0} file${files.length === 1 ? "" : "s"}`}
          </Button>
        </div>

        {blockers.length > 0 && !running && (
          <ul className="mt-4 space-y-1.5">
            {blockers.map((b) => (
              <li key={b.msg} className="flex items-center gap-2 text-xs text-warning-foreground">
                <AlertTriangle className="size-3.5 text-warning" /> {b.msg}
                {b.fix && (
                  <button className="font-semibold text-primary hover:underline" onClick={() => onEdit(b.fix!)}>
                    Fix
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {results && (
          <ul className="mt-5 space-y-2">
            {results.map((r, i) => (
              <li key={i} className="rounded-xl border bg-surface p-3">
                <div className="flex items-center gap-3">
                  {r.state === "done" ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : r.state === "failed" ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : r.state === "running" ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <span className="size-4 rounded-full border-2 border-input" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{cmds[i]?.output}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.state === "done"
                        ? `${formatBytes(r.blob?.size ?? 0)}${r.saved ? ` · saved to ${dir?.name}` : ""}`
                        : r.state === "failed"
                          ? r.error
                          : r.state === "running"
                            ? `${Math.round(r.progress * 100)}%`
                            : "Waiting"}
                    </div>
                  </div>
                  {r.state === "done" && r.blob && !r.saved && (
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(r.blob!, cmds[i].output)}>
                      <Download className="size-3.5" /> Download
                    </Button>
                  )}
                  {r.saved && <FolderCheck className="size-4 text-success" />}
                </div>
                {r.state === "running" && <Progress value={r.progress * 100} className="mt-2 h-1.5" />}
              </li>
            ))}
          </ul>
        )}

        {summary && (
          <div
            className={cn(
              "mt-4 rounded-xl px-3.5 py-2.5 text-sm",
              summary.status === "success" ? "bg-success/10 text-success" : summary.status === "partial" ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive",
            )}
          >
            {summary.status === "success"
              ? `All files converted in ${(summary.ms / 1000).toFixed(1)}s. Saved to History.`
              : summary.status === "partial"
                ? "Some files converted. Failed files are listed above. Saved to History."
                : "Nothing was converted. The attempt is saved to History as failed."}
          </div>
        )}

        {log.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">Engine log ({log.length} lines)</summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-ink p-3 font-mono text-[11px] text-ink-foreground/80">{log.join("\n")}</pre>
          </details>
        )}
        {results && results.some((r) => r.state === "done" && !r.saved) && results.filter((r) => r.blob).length > 1 && (
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => results.forEach((r, i) => r.blob && !r.saved && downloadBlob(r.blob, cmds[i].output))}
          >
            <Download className="size-4" /> Download all
          </Button>
        )}
        {!results && (
          <div className="mt-4">
            <Note>
              The first run downloads the FFmpeg engine (about 31 MB) from a public CDN. After that it's cached by your browser.
            </Note>
          </div>
        )}
        {running && <Square className="hidden" />}
      </div>
    </div>
  );
}
