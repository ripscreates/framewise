import { createFileRoute } from "@tanstack/react-router";
import guidePage from "../content/framewise-guide.html?raw";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "How to use Framewise" },
      {
        name: "description",
        content: "A friendly, step-by-step guide to Framewise: say what you want in plain words, review the FFmpeg command, and run it in your browser or on your desktop.",
      },
    ],
  }),
  component: Guide,
});

function Guide() {
  return (
    <iframe
      title="How to use Framewise"
      srcDoc={guidePage}
      className="fixed inset-0 z-50 h-dvh w-screen border-0 bg-background"
    />
  );
}
