const MEDIA_EXT = /\.(mp4|m4v|mov|mkv|webm|avi|wmv|flv|mpg|mpeg|ts|3gp|ogv|mp3|wav|m4a|aac|flac|ogg|opus|gif)$/i;

export function isMedia(f: File) {
  return f.type.startsWith("video/") || f.type.startsWith("audio/") || MEDIA_EXT.test(f.name);
}

export interface QueuedFile {
  id: string;
  file: File;
  path: string;
}

let counter = 0;
export function toQueued(files: File[], paths?: string[]): QueuedFile[] {
  return files.map((file, i) => ({
    id: `${Date.now().toString(36)}-${(counter++).toString(36)}`,
    file,
    path: paths?.[i] || (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

/* Minimal typings for the legacy entries API used for dropped folders. */
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (cb: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (cb: (e: FsEntry[]) => void, err: (e: unknown) => void) => void };
}

async function walk(entry: FsEntry, out: { file: File; path: string }[]) {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
    out.push({ file, path: entry.fullPath.replace(/^\//, "") });
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    let batch: FsEntry[];
    do {
      batch = await new Promise<FsEntry[]>((res, rej) => reader.readEntries(res, rej));
      for (const e of batch) await walk(e, out);
    } while (batch.length);
  }
}

export async function filesFromDrop(dt: DataTransfer) {
  const out: { file: File; path: string }[] = [];
  const items = Array.from(dt.items || []);
  const entries = items
    .map((it) => (it as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.())
    .filter((e): e is FsEntry => !!e);
  if (entries.length) {
    for (const e of entries) await walk(e, out);
  } else {
    Array.from(dt.files).forEach((f) => out.push({ file: f, path: f.name }));
  }
  return out;
}

export interface DirHandle {
  name: string;
  getFileHandle: (n: string, o: { create: boolean }) => Promise<{
    createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
  requestPermission?: (o: { mode: "readwrite" }) => Promise<string>;
  kind?: string;
}

export function canWriteFolders() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(): Promise<DirHandle | null> {
  const w = window as unknown as { showDirectoryPicker: (o: { mode: string }) => Promise<DirHandle> };
  try {
    return await w.showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return null;
  }
}

export async function dirFromDrop(dt: DataTransfer): Promise<DirHandle | null> {
  const item = dt.items?.[0] as (DataTransferItem & { getAsFileSystemHandle?: () => Promise<DirHandle | null> }) | undefined;
  if (!item?.getAsFileSystemHandle) return null;
  const h = await item.getAsFileSystemHandle();
  if (!h || h.kind !== "directory") return null;
  if (h.requestPermission) {
    const p = await h.requestPermission({ mode: "readwrite" });
    if (p !== "granted") return null;
  }
  return h;
}

export async function writeToDir(dir: DirHandle, name: string, blob: Blob) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
