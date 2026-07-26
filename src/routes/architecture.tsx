import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Crop,
  Cpu,
  Layers,
  Activity,
  BarChart3,
} from "lucide-react";


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

type Stage = {
  id: string;
  title: string;
  icon: React.ReactNode;
  what: string;
  how: string[];
  io: [string, string];
  tech: string;
};

const STAGES: Stage[] = [
  {
    id: "M1",
    title: "Input Acquisition",
    icon: <Camera className="h-4 w-4" />,
    what:
      "Grabs a continuous stream of still images (frames) from the webcam or a loaded video file. Nothing leaves the machine.",
    how: [
      "getUserMedia() opens the camera and pipes it into a <video> element.",
      "A requestAnimationFrame loop samples the video ~10–30 times per second.",
      "Each sampled frame is drawn onto an offscreen canvas so pixels can be read.",
    ],
    io: ["Camera / video file", "RGB frame (e.g. 640×480)"],
    tech: "MediaDevices API · Canvas 2D",
  },
  {
    id: "M2",
    title: "Face Detection & Pre-processing",
    icon: <Crop className="h-4 w-4" />,
    what:
      "Finds where the face is in the frame, crops it, and normalises lighting so the classifier sees a consistent input.",
    how: [
      "A lightweight detector (SSD/MTCNN-style cascade) returns a bounding box + 68 landmarks.",
      "The face is cropped, aligned on the eye axis and resized to a fixed square.",
      "CLAHE (contrast-limited adaptive histogram equalisation) evens out shadows and back-light.",
      "If no box is returned for N frames, the UI raises the 'No face detected' warning instead of guessing.",
    ],
    io: ["RGB frame", "Aligned face crop (grayscale-normalised)"],
    tech: "MTCNN / SSD-MobileNet · Landmarks · CLAHE",
  },
  {
    id: "M3",
    title: "CNN Spatial Feature Extraction",
    icon: <Cpu className="h-4 w-4" />,
    what:
      "Turns the face image into numbers. A convolutional network compresses the crop into a 512-dimensional feature vector describing muscle configuration — brow raise, lip corner pull, nose wrinkle.",
    how: [
      "Convolution layers learn edges → textures → facial action units, layer by layer.",
      "The final pooling layer outputs one 512-D embedding per frame (the classification head is removed).",
      "This is transfer learning: the backbone is pre-trained, then fine-tuned on micro-expression data.",
    ],
    io: ["Aligned face crop", "512-D feature vector"],
    tech: "ResNet-50 backbone · Global average pooling",
  },
  {
    id: "M4",
    title: "Temporal Sequence Buffer",
    icon: <Layers className="h-4 w-4" />,
    what:
      "A micro-expression is a movement, not a photo — it lasts 40–500 ms. So the system stacks the last 16 frame-vectors into a sliding window.",
    how: [
      "Ring buffer of length 16: newest vector pushed in, oldest dropped out.",
      "Result is a 16 × 512 matrix — the shape of the expression over time.",
      "The console's 'Sequence Buffer' meter shows this filling up before predictions stabilise.",
    ],
    io: ["512-D vector per frame", "16 × 512 sequence tensor"],
    tech: "Sliding window · Stride 1",
  },
  {
    id: "M5",
    title: "LSTM Temporal Modelling",
    icon: <Activity className="h-4 w-4" />,
    what:
      "Two stacked LSTM layers read the 16-step sequence in order and learn the onset → apex → offset dynamics that separate a genuine micro-expression from a slow, deliberate pose.",
    how: [
      "LSTM cells carry a hidden state, so frame 12 is interpreted in light of frames 1–11.",
      "Layer 1 (256 units) captures short motion; layer 2 (256 units) captures the full arc.",
      "Dropout between layers prevents memorising individual subjects.",
    ],
    io: ["16 × 512 sequence", "256-D temporal summary"],
    tech: "2 × LSTM(256) · Dropout 0.5",
  },
  {
    id: "M6",
    title: "Classification & Session Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    what:
      "A dense layer + softmax converts the temporal summary into 7 probabilities that add up to 1. The highest one is drawn on screen; everything is logged for the report.",
    how: [
      "Softmax over the 7 Ekman classes: fear, anger, disgust, happiness, sadness, surprise, contempt.",
      "Predictions below the confidence threshold are suppressed rather than shown as fact.",
      "Accepted predictions increment the cumulative frequency bars and append to the event log with a timestamp + snapshot.",
    ],
    io: ["256-D temporal summary", "Label + confidence + session record"],
    tech: "Dense → Softmax(7) · Argmax + threshold",
  },
];

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
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono-tight text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to console
          </Link>
        </header>
        <div className="mb-6 h-px bg-border" />

        {/* Flow strip */}
        <section className="mb-8 rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            End-to-end data flow
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono-tight text-[11px]">
            {[
              "Webcam",
              "Face detect",
              "CLAHE crop",
              "CNN 512-D",
              "Buffer 16",
              "LSTM 256×2",
              "Softmax 7",
              "Overlay + Report",
            ].map((n, i, arr) => (
              <span key={n} className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-foreground">
                  {n}
                </span>
                {i < arr.length - 1 && <span className="text-primary">→</span>}
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
                  {s.icon}
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

        {/* Why this design */}
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "Why a CNN?",
              d: "Images are spatial. Convolutions share weights across the image, so the model learns 'brow raised' once instead of separately for every pixel position.",
            },
            {
              t: "Why an LSTM?",
              d: "Micro-expressions are defined by how fast they appear and vanish. A single frame cannot express duration; a recurrent layer can.",
            },
            {
              t: "Why on-device?",
              d: "Faces are biometric data. Running inference locally means frames are never transmitted, which keeps interview footage private by construction.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-serif text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
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
            {[
              "Open the console and press Start Live Analysis; grant camera access (M1 begins).",
              "Watch the bounding box lock onto the face — that is M2 reporting a detection.",
              "Observe the Sequence Buffer meter fill to 16/16; until then M5 has no full window.",
              "Hold a neutral face, then flash a brief expression. The label and confidence update within ~500 ms.",
              "Cover the camera: M2 fails, the 'No face detected' warning appears, and no prediction is faked.",
              "Let the session run 30–60 s, press Stop, then Export PDF Report for timeline, log and snapshots.",
            ].map((s, i) => (
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
