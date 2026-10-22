import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useState, useSyncExternalStore } from "react";

export interface NativeEngineInfo {
  id: string;
  path: string;
  version: string;
  buildConfiguration: string;
  encoders: string[];
  filters: string[];
  bundled: boolean;
  compatible: boolean;
}

export interface EngineCatalog {
  bundled: NativeEngineInfo | null;
  system: NativeEngineInfo[];
}

export interface NativeMediaFile {
  path: string;
  name: string;
  size: number;
  fileType: string;
}

export interface NativeRunSummary {
  success: boolean;
  exitCode: number | null;
  log: string;
  cancelled: boolean;
}

export interface NativeRunCallbacks {
  onProgress: (ratio: number) => void;
  onLog: (line: string) => void;
  onRunId?: (runId: string) => void;
}

interface EngineState {
  catalog: EngineCatalog | null;
  loading: boolean;
  error: string | null;
}

let state: EngineState = { catalog: null, loading: false, error: null };
const listeners = new Set<() => void>();
function publish(next: EngineState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function useNativeEngines() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

export function useIsDesktopApp() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => setDesktop(isTauri()), []);
  return desktop;
}

export async function refreshNativeEngines() {
  publish({ ...state, loading: true, error: null });
  try {
    const catalog = await detectNativeEngines();
    const selected = typeof localStorage !== "undefined" ? localStorage.getItem(ENGINE_KEY) : null;
    if (
      selected &&
      selected !== "bundled" &&
      !catalog.system.some((engine) => engine.path === selected)
    ) {
      try {
        catalog.system.push(await inspectNativeEngine(selected));
      } catch {
        if (typeof localStorage !== "undefined") localStorage.removeItem(ENGINE_KEY);
      }
    }
    publish({ catalog, loading: false, error: null });
    return catalog;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not inspect FFmpeg engines.";
    publish({ ...state, loading: false, error: message });
    throw error;
  }
}

export function activeNativeEngine(catalog = state.catalog) {
  return catalog ? activeEngine(catalog) : null;
}

export async function chooseNativeMedia(kind: "files" | "folder") {
  const selected = await open(
    kind === "folder"
      ? { directory: true, multiple: true, title: "Choose media folders" }
      : {
          multiple: true,
          title: "Choose media files",
          filters: [
            {
              name: "Media",
              extensions: [
                "mp4",
                "m4v",
                "mov",
                "mkv",
                "webm",
                "avi",
                "wmv",
                "flv",
                "mpg",
                "mpeg",
                "ts",
                "3gp",
                "ogv",
                "mp3",
                "wav",
                "m4a",
                "aac",
                "flac",
                "ogg",
                "opus",
                "gif",
              ],
            },
          ],
        },
  );
  if (!selected) return [];
  return nativeMediaFiles(Array.isArray(selected) ? selected : [selected]);
}

export async function chooseNativeEngineFile() {
  const selected = await open({ multiple: false, title: "Choose an FFmpeg executable" });
  return Array.isArray(selected) ? (selected[0] ?? null) : selected;
}

export async function chooseNativeSubtitle() {
  const selected = await open({
    multiple: false,
    title: "Choose a subtitle file",
    filters: [{ name: "Subtitles", extensions: ["srt", "vtt", "ass", "ssa"] }],
  });
  return Array.isArray(selected) ? (selected[0] ?? null) : selected;
}

export async function chooseNativeOutputFolder() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose an output folder",
  });
  return Array.isArray(selected) ? (selected[0] ?? null) : selected;
}

export async function defaultNativeOutputFolder() {
  return invoke<string>("default_output_directory");
}

const ENGINE_KEY = "framewise.desktop.engine";

export async function detectNativeEngines() {
  return invoke<EngineCatalog>("detect_ffmpeg_engines");
}

export async function inspectNativeEngine(path: string) {
  return invoke<NativeEngineInfo>("probe_ffmpeg", { path });
}

export async function nativeMediaFiles(paths: string[]) {
  return invoke<NativeMediaFile[]>("list_media_files", { paths });
}

export function selectedEnginePath(catalog: EngineCatalog) {
  if (typeof localStorage === "undefined")
    return catalog.bundled?.path ?? catalog.system[0]?.path ?? null;
  const saved = localStorage.getItem(ENGINE_KEY);
  if (saved === "bundled" && catalog.bundled) return catalog.bundled.path;
  if (saved) {
    const system = catalog.system.find((item) => item.path === saved);
    if (system) return system.path;
  }
  return catalog.bundled?.path ?? catalog.system[0]?.path ?? null;
}

export function saveSelectedEngine(engine: NativeEngineInfo) {
  localStorage.setItem(ENGINE_KEY, engine.bundled ? "bundled" : engine.path);
  publish({ ...state });
}

export function rememberSystemEngine(engine: NativeEngineInfo) {
  const catalog = state.catalog ?? { bundled: null, system: [] };
  const system = [...catalog.system.filter((item) => item.path !== engine.path), engine];
  publish({ ...state, catalog: { ...catalog, system } });
}

export function activeEngine(catalog: EngineCatalog) {
  const path = selectedEnginePath(catalog);
  if (!path) return null;
  if (catalog.bundled?.path === path) return catalog.bundled;
  return catalog.system.find((item) => item.path === path) ?? null;
}

export async function runNativeFfmpeg(
  enginePath: string,
  args: string[],
  callbacks: NativeRunCallbacks,
): Promise<NativeRunSummary> {
  const runId = `fw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  callbacks.onRunId?.(runId);
  let stopProgress: UnlistenFn | undefined;
  let stopLog: UnlistenFn | undefined;
  try {
    stopProgress = await listen<{ runId: string; ratio: number }>("ffmpeg-progress", (event) => {
      if (event.payload.runId === runId) callbacks.onProgress(event.payload.ratio);
    });
    stopLog = await listen<{ runId: string; line: string }>("ffmpeg-log", (event) => {
      if (event.payload.runId === runId) callbacks.onLog(event.payload.line);
    });
    return await invoke<NativeRunSummary>("run_ffmpeg", { runId, enginePath, args });
  } finally {
    stopProgress?.();
    stopLog?.();
  }
}

export function cancelNativeFfmpeg(runId: string) {
  return invoke<boolean>("cancel_ffmpeg", { runId });
}
