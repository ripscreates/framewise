import { createFileRoute } from "@tanstack/react-router";
import retrospectivePage from "../content/framewise-v1-retrospective.html?raw";

export const Route = createFileRoute("/v1-retrospective")({
  head: () => ({
    meta: [
      { title: "Framewise V1 Retrospective" },
      {
        name: "description",
        content: "A visual case study on the Framewise V1 product journey, interface, lessons, technology, and local setup.",
      },
    ],
  }),
  component: Retrospective,
});

function Retrospective() {
  return (
    <iframe
      title="Framewise V1 retrospective"
      srcDoc={retrospectivePage}
      className="fixed inset-0 z-50 h-dvh w-screen border-0 bg-background"
    />
  );
}
