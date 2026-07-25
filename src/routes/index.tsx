import { createFileRoute } from "@tanstack/react-router";
import { InvestigatorConsole } from "@/components/InvestigatorConsole";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Micro-Expression Recognition · Investigator Console" },
      {
        name: "description",
        content:
          "Live CNN-LSTM investigator console — real-time micro-expression classification across the seven Ekman universal emotions.",
      },
      { property: "og:title", content: "Investigator Console · Micro-Expression Recognition" },
      {
        property: "og:description",
        content: "Real-time CNN-LSTM face pipeline running fully on-device.",
      },
    ],
  }),
});

function Index() {
  return <InvestigatorConsole />;
}
