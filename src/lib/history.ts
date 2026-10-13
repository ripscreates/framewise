import { useEffect, useState } from "react";
import type { Settings } from "./workflow";

export type RunStatus = "success" | "partial" | "failed";

export interface RunRecord {
  id: string;
  name: string;
  date: string;
  settings: Settings;
  files: { name: string; size: number }[];
  outputs: string[];
  command: string;
  status: RunStatus;
  destination: "folder" | "download";
  durationMs: number;
  error?: string;
}

const KEY = "framewise.history.v1";
const EVT = "framewise:history";

export function readHistory(): RunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as RunRecord[]) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function addHistory(r: RunRecord) {
  const all = [r, ...readHistory()].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(EVT));
}

export function removeHistory(id: string) {
  localStorage.setItem(KEY, JSON.stringify(readHistory().filter((r) => r.id !== id)));
  window.dispatchEvent(new Event(EVT));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useHistory() {
  const [items, setItems] = useState<RunRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const sync = () => setItems(readHistory());
    sync();
    setLoaded(true);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { items, loaded };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB"];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`;
}
