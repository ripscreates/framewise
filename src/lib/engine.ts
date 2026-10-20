import { useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";

/**
 * Lazy, browser-only FFmpeg WebAssembly engine (single-thread core).
 * Nothing here is imported until the user loads the engine or starts a run.
 */
export type EngineStatus = "idle" | "loading" | "ready" | "error" | "unsupported";

interface State {
  status: EngineStatus;
  message: string;
}

let state: State = { status: "idle", message: "Loads on first run (~31 MB, cached after)" };
const listeners = new Set<() => void>();
function set(s: State) {
  state = s;
  listeners.forEach((l) => l());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let instance: any = null;
let loading: Promise<unknown> | null = null;
const CORE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

export function useEngine() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function checkSupport() {
  if (typeof window === "undefined") return;
  if (typeof WebAssembly === "undefined" || typeof Worker === "undefined") {
    set({ status: "unsupported", message: "This browser can't run WebAssembly workers" });
  }
}

export async function loadEngine() {
  if (instance) return instance;
  if (state.status === "unsupported") throw new Error(state.message);
  if (!loading) {
    set({ status: "loading", message: "Downloading FFmpeg engine…" });
    loading = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      instance = ff;
      set({
        status: "ready",
        message: isTauri() ? "Runs locally in this app · WebAssembly" : "Runs locally in this tab",
      });
      return ff;
    })().catch((e: unknown) => {
      loading = null;
      set({ status: "error", message: e instanceof Error ? e.message : "Engine failed to load" });
      throw e;
    });
  }
  await loading;
  return instance;
}

export interface JobFile {
  file: File;
  outputName: string;
  args: (input: string, output: string, subtitle?: string) => string[];
}

export interface JobCallbacks {
  onFileStart: (index: number) => void;
  onProgress: (index: number, ratio: number) => void;
  onLog: (line: string) => void;
}

export async function runJob(
  files: JobFile[],
  subtitle: File | null,
  cb: JobCallbacks,
): Promise<{ index: number; ok: boolean; blob?: Blob; error?: string }[]> {
  const ff = await loadEngine();
  let current = 0;
  const onProgress = ({ progress }: { progress: number }) => cb.onProgress(current, Math.max(0, Math.min(1, progress)));
  const onLog = ({ message }: { message: string }) => cb.onLog(message);
  ff.on("progress", onProgress);
  ff.on("log", onLog);
  const results: { index: number; ok: boolean; blob?: Blob; error?: string }[] = [];
  let subName: string | undefined;
  try {
    if (subtitle) {
      const ext = subtitle.name.split(".").pop()?.toLowerCase() || "srt";
      subName = `subs.${ext}`;
      await ff.writeFile(subName, new Uint8Array(await subtitle.arrayBuffer()));
    }
    for (let i = 0; i < files.length; i++) {
      current = i;
      cb.onFileStart(i);
      const f = files[i];
      const inExt = f.file.name.split(".").pop()?.toLowerCase() || "bin";
      const outExt = f.outputName.split(".").pop() || "mp4";
      const inName = `in_${i}.${inExt}`;
      const outName = `out_${i}.${outExt}`;
      try {
        await ff.writeFile(inName, new Uint8Array(await f.file.arrayBuffer()));
        const code: number = await ff.exec(f.args(inName, outName, subName));
        if (code !== 0) throw new Error(`FFmpeg exited with code ${code}. See the log for details.`);
        const data = (await ff.readFile(outName)) as Uint8Array;
        if (!data || data.byteLength === 0) throw new Error("FFmpeg produced an empty file.");
        results.push({ index: i, ok: true, blob: new Blob([data.slice().buffer]) });
        cb.onProgress(i, 1);
      } catch (e) {
        results.push({ index: i, ok: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        await ff.deleteFile(inName).catch(() => {});
        await ff.deleteFile(outName).catch(() => {});
      }
    }
  } finally {
    if (subName) await ff.deleteFile(subName).catch(() => {});
    ff.off("progress", onProgress);
    ff.off("log", onLog);
  }
  return results;
}
