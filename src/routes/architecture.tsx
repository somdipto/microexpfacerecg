import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Crop,
  Cpu,
  Layers,
  Activity,
  BarChart3,
  Download,
} from "lucide-react";
import {
  STAGES,
  FLOW,
  RUNTIME,
  RATIONALE,
  DEMO_STEPS,
} from "@/lib/architecture-data";
import { generateArchitecturePdf } from "@/lib/architecture-report";

export const Route = createFileRoute("/architecture")({
  component: ArchitecturePage,
  head: () => ({
    meta: [
      { title: "System Architecture · Micro-Expression Recognition Pipeline" },
      {
        name: "description",
        content:
          "Step-by-step walkthrough of the CNN-LSTM micro-expression pipeline: frame capture, face detection, CLAHE, 512-D CNN embeddings, LSTM temporal modelling and softmax over 7 emotions.",
      },
      {
        property: "og:title",
        content: "System Architecture · CNN-LSTM Micro-Expression Pipeline",
      },
      {
        property: "og:description",
        content:
          "How every frame travels from webcam to emotion label — M1 through M6 explained module by module.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ICONS: Record<string, React.ReactNode> = {
  M1: <Camera className="h-4 w-4" />,
  M2: <Crop className="h-4 w-4" />,
  M3: <Cpu className="h-4 w-4" />,
  M4: <Layers className="h-4 w-4" />,
  M5: <Activity className="h-4 w-4" />,
  M6: <BarChart3 className="h-4 w-4" />,
};

function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="font-mono-tight text-[11px] uppercase tracking-[0.2em] text-primary">
              08 · System Architecture
            </div>
            <h1 className="mt-1 font-serif text-3xl md:text-4xl font-semibold tracking-tight">
              How a frame becomes an emotion
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every step the system performs, in the order it performs it. Follow M1 → M6
              and you have walked the full path from camera pixel to the label drawn on
              the investigator's screen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => generateArchitecturePdf()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 font-mono-tight text-[11px] uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Export architecture report
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono-tight text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to console
            </Link>
          </div>
        </header>
        <div className="mb-6 h-px bg-border" />

        {/* Flow strip */}
        <section className="mb-8 rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            End-to-end data flow
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono-tight text-[11px]">
            {FLOW.map((n, i) => (
              <span key={n} className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-foreground">
                  {n}
                </span>
                {i < FLOW.length - 1 && <span className="text-primary">→</span>}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The loop repeats for every single frame, roughly ten times a second, with an
            end-to-end latency under 500 ms. No image is uploaded — inference runs entirely
            in the browser on the local device.
          </p>
        </section>

        {/* Stages */}
        <ol className="space-y-4">
          {STAGES.map((s, i) => (
            <li
              key={s.id}
              className="relative rounded-xl border border-border bg-card p-4 md:p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  {ICONS[s.id]}
                </span>
                <div>
                  <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-primary">
                    Step {i + 1} · {s.id}
                  </div>
                  <h2 className="font-serif text-xl md:text-2xl font-semibold tracking-tight">
                    {s.title}
                  </h2>
                </div>
                <span className="ml-auto rounded-md border border-border bg-panel px-2.5 py-1.5 font-mono-tight text-[10px] text-muted-foreground">
                  {s.tech}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed">{s.what}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_1fr]">
                <div>
                  <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    What happens, in order
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {s.how.map((h) => (
                      <li key={h} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-panel p-3">
                  <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Input → Output
                  </div>
                  <div className="mt-2 font-mono-tight text-[11px] leading-relaxed">
                    <div className="text-muted-foreground">in</div>
                    <div className="text-foreground">{s.io[0]}</div>
                    <div className="mt-2 text-muted-foreground">out</div>
                    <div className="text-foreground">{s.io[1]}</div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Runtime characteristics */}
        <section className="mt-8 rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-primary">
            Runtime characteristics
          </div>
          <dl className="mt-3 divide-y divide-border">
            {RUNTIME.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 md:grid-cols-[220px_1fr]">
                <dt className="font-mono-tight text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {k}
                </dt>
                <dd className="text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Why this design */}
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {RATIONALE.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-serif text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>

        {/* Demo script */}
        <section className="mt-8 rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-primary">
            Live demonstration · run-through
          </div>
          <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            Steps to reproduce the result
          </h2>
          <ol className="mt-4 space-y-2">
            {DEMO_STEPS.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono-tight text-[10px] text-primary-foreground">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 font-mono-tight text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Pipeline · MTCNN → ResNet-50 (512-D) → 2× LSTM 256 → Softmax × 7
          </span>
          <span>AIT · CSE · 2025-26</span>
        </footer>
      </div>
    </div>
  );
}
