import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { History as HistoryIcon, Repeat, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopBar } from "@/components/AppShell";
import { clearHistory, removeHistory, useHistory } from "@/lib/history";
import { summarize } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Framewise" },
      { name: "description", content: "Your past Framewise conversions, saved locally in this browser." },
      { property: "og:title", content: "History — Framewise" },
      { property: "og:description", content: "Search and repeat previous FFmpeg conversions." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { items, loaded } = useHistory();
  const [q, setQ] = useState("");
  const list = items.filter((r) => `${r.name} ${r.command} ${r.files.map((f) => f.name).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <TopBar
        title="History"
        subtitle="Runs you've done in this browser. Stored only on this device."
        actions={items.length > 0 && <Button variant="ghost" size="sm" onClick={() => confirm("Clear all history?") && clearHistory()}><Trash2 className="size-3.5" /> Clear all</Button>}
      />
      <div className="px-5 py-6 md:px-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by task, file or command" className="pl-9" />
        </div>
        {loaded && items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed bg-surface px-6 py-14 text-center">
            <HistoryIcon className="size-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold">No runs yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">When you run a conversion in the browser, it appears here so you can repeat it.</p>
            <Button asChild variant="brand" className="mt-5"><Link to="/">Create something</Link></Button>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {list.map((r) => (
              <li key={r.id} className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", r.status === "success" ? "bg-success/15 text-success" : r.status === "partial" ? "bg-warning/20 text-warning-foreground" : "bg-destructive/10 text-destructive")}>{r.status}</span>
                      <h3 className="truncate text-sm font-semibold">{r.name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleString()} · {r.files.length} file{r.files.length > 1 ? "s" : ""} · {summarize(r.settings)}
                    </p>
                    {r.error && r.status !== "success" && <p className="mt-1 text-xs text-destructive">{r.error}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" disabled={r.status === "failed"}>
                      <Link to="/" search={{ repeat: r.id }}><Repeat className="size-3.5" /> Repeat</Link>
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => removeHistory(r.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
                <code className="mt-3 block truncate rounded-lg bg-muted px-3 py-2 font-mono text-[11px]">{r.command}</code>
              </li>
            ))}
            {items.length > 0 && list.length === 0 && <p className="text-sm text-muted-foreground">No runs match “{q}”.</p>}
          </ul>
        )}
      </div>
    </div>
  );
}
