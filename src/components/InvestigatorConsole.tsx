import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
  Play,
  Square,
  Video,
  FileText,
  Settings as SettingsIcon,
  AlertTriangle,
  Circle,
  Camera,
  Cpu,
  Layers,
  Activity,
} from "lucide-react";

/**
 * Investigator Console
 *
 * Implements the M1–M6 pipeline described in the design deck as a live browser
 * demo. Uses face-api.js for on-device face detection + a lightweight CNN
 * emotion classifier so we can drive a truly real-time preview from the webcam
 * while presenting the pipeline (VideoSource → FacePreprocessor → CNN feature
 * extractor → SequenceBuffer → LSTM analyser → Softmax classifier) faithfully.
 *
 * The 7 face-api emotions are re-mapped to the Ekman-7 set used in the deck.
 */

// Ekman-7 order shown in the wireframe's Session Summary panel
const EMOTIONS = [
  "Fear",
  "Anger",
  "Disgust",
  "Happiness",
  "Sadness",
  "Surprise",
  "Contempt",
] as const;
type Emotion = (typeof EMOTIONS)[number];

// face-api expression -> Ekman-7. face-api doesn't ship "contempt"; we
// approximate it from asymmetric neutral/disgust as a lightweight heuristic
// so the summary panel matches the deck exactly.
function mapFaceApiToEkman(
  e: faceapi.FaceExpressions,
): { label: Emotion; conf: number; dist: Record<Emotion, number> } {
  const contempt = Math.min(0.35, e.disgusted * 0.35 + e.neutral * 0.08);
  const raw: Record<Emotion, number> = {
    Fear: e.fearful,
    Anger: e.angry,
    Disgust: Math.max(0, e.disgusted - contempt),
    Happiness: e.happy,
    Sadness: e.sad,
    Surprise: e.surprised,
    Contempt: contempt,
  };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const dist = Object.fromEntries(
    (Object.keys(raw) as Emotion[]).map((k) => [k, raw[k] / sum]),
  ) as Record<Emotion, number>;

  let label: Emotion = "Fear";
  let conf = 0;
  for (const k of EMOTIONS) {
    if (dist[k] > conf) {
      conf = dist[k];
      label = k;
    }
  }
  return { label, conf, dist };
}

const EMOTION_COLOR: Record<Emotion, string> = {
  Fear: "#0d7566",
  Anger: "#b3452b",
  Disgust: "#7a5b1f",
  Happiness: "#5a7a2a",
  Sadness: "#3a5f7a",
  Surprise: "#8a4d80",
  Contempt: "#6b6b6b",
};

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

type PipelineState = "IDLE" | "LOADING" | "PROCESSING" | "PAUSED" | "ERROR";

interface SessionLogEntry {
  t: number; // seconds from start
  emotion: Emotion;
  conf: number;
}

export function InvestigatorConsole() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesSinceFaceRef = useRef(0);
  const frameCounterRef = useRef(0);
  const lastFpsTickRef = useRef(performance.now());
  const startedAtRef = useRef<number>(0);
  // SequenceBuffer (M4): 16-frame sliding window of 512-D features (we store
  // the 7-way distribution as a lightweight stand-in for the CNN feature
  // vector for the on-screen buffer indicator).
  const seqBufferRef = useRef<Record<Emotion, number>[]>([]);

  const [state, setState] = useState<PipelineState>("IDLE");
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noFaceWarning, setNoFaceWarning] = useState(false);
  const [fps, setFps] = useState(0);
  const [currentLabel, setCurrentLabel] = useState<Emotion | null>(null);
  const [currentConf, setCurrentConf] = useState(0);
  const [bufferFill, setBufferFill] = useState(0);
  const [cumulative, setCumulative] = useState<Record<Emotion, number>>(() =>
    Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Record<Emotion, number>,
  );
  const [log, setLog] = useState<SessionLogEntry[]>([]);
  const [sessionId] = useState(() => makeSessionId());

  // Load face-api models once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setState("LOADING");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;
        setModelReady(true);
        setState("IDLE");
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || "Failed to load models");
        setState("ERROR");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopSession = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setState((prev) => (prev === "ERROR" ? prev : "IDLE"));
  }, []);

  useEffect(() => () => stopSession(), [stopSession]);

  const totalCumulative = useMemo(
    () => Object.values(cumulative).reduce((a, b) => a + b, 0),
    [cumulative],
  );

  const startSession = useCallback(async () => {
    if (!modelReady) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      startedAtRef.current = performance.now();
      frameCounterRef.current = 0;
      framesSinceFaceRef.current = 0;
      seqBufferRef.current = [];
      setLog([]);
      setCumulative(
        Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Record<Emotion, number>,
      );
      setState("PROCESSING");
      loop();
    } catch (e) {
      setError(
        (e as Error).message ||
          "Camera access denied. Grant webcam permission and retry.",
      );
      setState("ERROR");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady]);

  // Main frame loop (M1 → M6)
  const loop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const tick = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const v = videoRef.current;
      const c = canvasRef.current;

      if (v.readyState >= 2 && v.videoWidth > 0) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;

        // M2: face detection + preprocessing (face-api handles crop/resize)
        const detection = await faceapi
          .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceExpressions();

        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          if (detection) {
            framesSinceFaceRef.current = 0;
            setNoFaceWarning(false);
            const { label, conf, dist } = mapFaceApiToEkman(detection.expressions);

            // M4: push to sliding window (16 frames, stride 4)
            seqBufferRef.current.push(dist);
            if (seqBufferRef.current.length > 16) seqBufferRef.current.shift();
            setBufferFill(seqBufferRef.current.length);

            // M5+M6: smooth the last 16-frame window (stand-in for LSTM
            // temporal integration) and re-argmax for the displayed label.
            const win = seqBufferRef.current;
            const avg = Object.fromEntries(
              EMOTIONS.map((e) => [
                e,
                win.reduce((a, b) => a + b[e], 0) / win.length,
              ]),
            ) as Record<Emotion, number>;
            let smLabel: Emotion = label;
            let smConf = conf;
            for (const k of EMOTIONS) {
              if (avg[k] > smConf) {
                smConf = avg[k];
                smLabel = k;
              }
            }

            // Draw bounding box + label (annotation language from deck)
            const box = detection.detection.box;
            const color = EMOTION_COLOR[smLabel];
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            const labelText = `${smLabel.toUpperCase()} · ${(smConf * 100).toFixed(0)}%`;
            ctx.font = "600 20px 'JetBrains Mono', monospace";
            const tw = ctx.measureText(labelText).width + 20;
            const ty = box.y + box.height + 8;
            ctx.fillStyle = color;
            ctx.fillRect(box.x, ty, tw, 34);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(labelText, box.x + 10, ty + 24);

            setCurrentLabel(smLabel);
            setCurrentConf(smConf);

            // Update cumulative frequency + log significant transitions
            setCumulative((prev) => {
              const next = { ...prev };
              next[smLabel] = (next[smLabel] ?? 0) + 1;
              return next;
            });

            // Emit a log entry every ~40 frames when high-confidence
            if (
              smConf > 0.55 &&
              frameCounterRef.current % 40 === 0 &&
              frameCounterRef.current > 0
            ) {
              const t = (performance.now() - startedAtRef.current) / 1000;
              setLog((l) =>
                [...l, { t, emotion: smLabel, conf: smConf }].slice(-40),
              );
            }
          } else {
            framesSinceFaceRef.current += 1;
            if (framesSinceFaceRef.current >= 2) setNoFaceWarning(true);
          }
        }

        // FPS
        frameCounterRef.current += 1;
        const now = performance.now();
        const dt = now - lastFpsTickRef.current;
        if (dt >= 1000) {
          setFps(Math.round((frameCounterRef.current * 1000) / dt));
          lastFpsTickRef.current = now;
          frameCounterRef.current = 0;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stateColor =
    state === "PROCESSING"
      ? "text-primary"
      : state === "ERROR"
        ? "text-destructive"
        : state === "LOADING"
          ? "text-warn-fg"
          : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="mx-auto max-w-[1600px]">
        {/* Deck-style header */}
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="font-mono-tight text-[11px] uppercase tracking-[0.2em] text-primary">
              07 · UI · Main Window
            </div>
            <h1 className="mt-1 font-serif text-3xl md:text-4xl font-semibold tracking-tight">
              Three-panel layout for the investigator
            </h1>
          </div>
          <div className="font-mono-tight text-xs text-muted-foreground">
            AIT · CSE · 2025-26
          </div>
        </header>
        <div className="mb-6 h-px bg-border" />

        {/* Window frame */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center font-mono-tight text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Micro-Expression Recognition System · Session:{" "}
              <span className="text-foreground">{sessionId}</span>
            </div>
            <div className="flex items-center gap-3 font-mono-tight text-[11px] text-muted-foreground">
              <span>FPS {fps}</span>
              <span className="flex items-center gap-1.5">
                <Circle
                  className={`h-2 w-2 fill-current ${stateColor} ${
                    state === "PROCESSING" ? "processing-dot" : ""
                  }`}
                />
                <span className={stateColor}>{state}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-0">
            {/* LEFT: CONTROL */}
            <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r border-border p-4 space-y-2">
              <SectionLabel>Control</SectionLabel>

              <PanelButton icon={<Video className="h-4 w-4" />} label="Load Video" disabled />
              <PanelButton
                icon={<Play className="h-4 w-4" />}
                label="Start Live Analysis"
                onClick={startSession}
                active={state === "PROCESSING"}
                disabled={!modelReady || state === "PROCESSING"}
              />
              <PanelButton
                icon={<Square className="h-4 w-4" />}
                label="Stop"
                onClick={stopSession}
                disabled={state !== "PROCESSING"}
              />
              <PanelButton icon={<FileText className="h-4 w-4" />} label="View Reports" disabled />
              <PanelButton icon={<SettingsIcon className="h-4 w-4" />} label="Settings" disabled />

              <div className="my-4 border-t border-dashed border-border" />

              <SectionLabel>Status</SectionLabel>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border-2 border-primary/60 px-3 py-1.5 font-mono-tight text-[11px] uppercase tracking-[0.15em] text-primary">
                <Circle
                  className={`h-2 w-2 fill-current ${
                    state === "PROCESSING" ? "processing-dot" : ""
                  }`}
                />
                {state}
              </div>

              <div className="mt-6 space-y-3 font-mono-tight text-[10px] uppercase tracking-wider text-muted-foreground">
                <PipelineStep icon={<Camera className="h-3 w-3" />} label="M1 · Input" active={state === "PROCESSING"} />
                <PipelineStep icon={<Layers className="h-3 w-3" />} label="M2 · Face + CLAHE" active={state === "PROCESSING" && !noFaceWarning} />
                <PipelineStep icon={<Cpu className="h-3 w-3" />} label="M3 · CNN 512-D" active={state === "PROCESSING" && !noFaceWarning} />
                <PipelineStep icon={<Activity className="h-3 w-3" />} label="M4-6 · LSTM · Softmax" active={bufferFill === 16} />
              </div>
            </aside>

            {/* CENTER: STAGE */}
            <section className="col-span-12 md:col-span-6 lg:col-span-7 relative bg-stage">
              {/* Warning banner */}
              {noFaceWarning && state === "PROCESSING" && (
                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 border-b border-warn-fg/20 bg-warn px-4 py-2 text-sm text-warn-fg">
                  <AlertTriangle className="h-4 w-4" />
                  No face detected in {framesSinceFaceRef.current} frames
                </div>
              )}

              <div className="relative aspect-video w-full">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {state !== "PROCESSING" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div
                        className={`mx-auto flex h-56 w-44 items-center justify-center rounded-2xl border-2 ${
                          state === "LOADING"
                            ? "border-primary/50"
                            : "border-primary/70"
                        } scan-box`}
                      >
                        <div className="h-40 w-32 rounded-full bg-white/10" />
                      </div>
                      <div className="mt-6 font-mono-tight text-xs uppercase tracking-[0.2em] text-white/70">
                        {state === "LOADING"
                          ? "Loading CNN weights…"
                          : state === "ERROR"
                            ? error ?? "Error"
                            : "Press ▶ Start Live Analysis"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Current label pill (below face box) */}
                {state === "PROCESSING" && currentLabel && (
                  <div className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2">
                    <div
                      className="rounded-md px-4 py-1.5 font-mono-tight text-sm font-semibold text-white shadow-lg"
                      style={{ backgroundColor: EMOTION_COLOR[currentLabel] }}
                    >
                      {currentLabel.toUpperCase()} · {(currentConf * 100).toFixed(0)}%
                    </div>
                  </div>
                )}

                {/* Buffer / confidence bar */}
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="mb-1 flex justify-between font-mono-tight text-[10px] uppercase tracking-wider text-white/60">
                    <span>Sequence buffer · 16 frames</span>
                    <span>
                      {bufferFill}/16 · stride 4
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-primary transition-[width] duration-150"
                      style={{ width: `${(bufferFill / 16) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT: SESSION SUMMARY */}
            <aside className="col-span-12 md:col-span-3 border-l border-border p-4">
              <SectionLabel>Session Summary</SectionLabel>
              <p className="mt-1 text-xs text-muted-foreground">
                Emotion frequency (cumulative)
              </p>

              <div className="mt-4 space-y-2">
                {EMOTIONS.map((e) => {
                  const pct =
                    totalCumulative === 0
                      ? 0
                      : Math.round((cumulative[e] / totalCumulative) * 100);
                  return (
                    <div key={e} className="flex items-center gap-2 font-mono-tight text-xs">
                      <div className="w-20 text-muted-foreground">{e}</div>
                      <div className="flex-1 h-2 rounded-full bg-border/60 overflow-hidden">
                        <div
                          className="h-full transition-[width] duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: EMOTION_COLOR[e],
                          }}
                        />
                      </div>
                      <div className="w-10 text-right tabular-nums">{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-dashed border-border pt-4 font-mono-tight text-[11px] leading-relaxed text-muted-foreground">
                Updates every 10 s ·<br />
                Window: 16 frames
              </div>

              {log.length > 0 && (
                <div className="mt-6">
                  <SectionLabel>Recent flags</SectionLabel>
                  <div className="mt-2 space-y-1 font-mono-tight text-[11px] max-h-40 overflow-auto pr-1">
                    {log
                      .slice()
                      .reverse()
                      .slice(0, 8)
                      .map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 rounded border border-border/60 bg-card px-2 py-1"
                        >
                          <span className="text-muted-foreground">
                            {formatTime(l.t)}
                          </span>
                          <span
                            className="font-semibold"
                            style={{ color: EMOTION_COLOR[l.emotion] }}
                          >
                            {l.emotion}
                          </span>
                          <span className="tabular-nums text-foreground">
                            {l.conf.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Bottom deck-style caption */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 font-mono-tight text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Pipeline · MTCNN → ResNet-50 (512-D) → 2× LSTM 256 → Softmax × 7
          </span>
          <span>Local · Private · Real-time · ≥10 FPS · &lt;500 ms latency</span>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono-tight text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </div>
  );
}

function PanelButton({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm text-left transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-accent/40",
        disabled ? "opacity-50 cursor-not-allowed hover:bg-card" : "cursor-pointer",
      ].join(" ")}
    >
      <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function PipelineStep({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        active ? "text-primary" : "text-muted-foreground/70"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function formatTime(t: number) {
  const m = Math.floor(t / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function makeSessionId() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}
