"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import * as faceapi from "face-api.js";

import {
  EMOTIONS,
  EMOTION_COLOR,
  LEAKAGE_EMOTIONS,
  averageDist,
  emptyDist,
  mapFaceApiToEkman,
  type Emotion,
  type EmotionDist,
} from "@/lib/emotions";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type PipelineState =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "PROCESSING"
  | "ERROR";

export interface MicroSpike {
  id: string;
  t: number; // seconds from session start
  emotion: Emotion;
  peak: number; // 0..1 peak intensity of the leaking emotion
  durationMs: number;
  isLeakage: boolean; // contradicts the sustained mask
  snapshot?: string;
}

export interface TimelinePoint {
  t: number; // seconds from session start
  dist: EmotionDist;
  dominant: Emotion;
  conf: number;
  maskLabel: Emotion; // sustained label (temporal)
}

export interface SessionLogEntry {
  t: number;
  emotion: Emotion;
  conf: number;
  snapshot?: string;
}

export interface SpikeDetectorState {
  /** emotion currently in a rising phase */
  rising: Emotion | null;
  riseStart: number; // performance.now ms
  peak: number;
  peakAt: number;
  baseline: number;
}

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

const MODEL_URL = "/models";

const SEQ_WINDOW = 16;
const TIMELINE_MAX = 120; // ~12 s of history at 10 Hz UI refresh
const SPIKES_MAX = 40;
const LOG_MAX = 40;
const SNAPSHOTS_MAX = 12;

/** A non-dominant emotion must cross this to count as a rising micro-spike. */
const SPIKE_ONSET = 0.3;
/** A spike resolves when the emotion falls back below this fraction of its peak. */
const SPIKE_RESOLVE = 0.45;
/** Max duration (ms) of a genuine micro-expression (upper bound of the 40–500 ms band). */
const MICRO_MAX_MS = 1500;
/** Leak scoring window (ms) — count spikes in the trailing 10 s. */
const LEAK_WINDOW_MS = 10_000;

const POSITIVE_MASK: Emotion[] = ["Happiness", "Contempt", "Surprise"];

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */

export function useMicroExpression() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- high-frequency refs (updated every frame, not in React state) ---
  const seqBufferRef = useRef<EmotionDist[]>([]);
  const frameCounterRef = useRef(0);
  const framesSinceFaceRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastFpsTickRef = useRef(0);
  const fpsCounterRef = useRef(0);
  const latencyAccumRef = useRef(0);
  const latencyCountRef = useRef(0);
  const lastUiPushRef = useRef(0);
  const snapshotRequestedRef = useRef(false);

  // live (throttled) state read by the UI push interval
  const liveRef = useRef({
    fps: 0,
    latencyMs: 0,
    bufferFill: 0,
    noFace: false,
    label: null as Emotion | null,
    conf: 0,
    dist: emptyDist(),
    maskLabel: "Happiness" as Emotion,
    cumulative: emptyDist(),
    totalFrames: 0,
    leakageRisk: 0,
    timeline: [] as TimelinePoint[],
    spikes: [] as MicroSpike[],
    log: [] as SessionLogEntry[],
    snapshots: [] as string[],
    box: null as { x: number; y: number; width: number; height: number } | null,
  });

  // spike detector per-emotion tracking
  const spikeRef = useRef<SpikeDetectorState>({
    rising: null,
    riseStart: 0,
    peak: 0,
    peakAt: 0,
    baseline: 0,
  });
  const spikeBaselineRef = useRef<EmotionDist>(emptyDist());
  const lastBoxRef = useRef<faceapi.Box | null>(null);

  // --- React state (drives render at ~10 Hz) ---
  const [state, setState] = useState<PipelineState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);

  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [bufferFill, setBufferFill] = useState(0);
  const [noFaceWarning, setNoFaceWarning] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<Emotion | null>(null);
  const [currentConf, setCurrentConf] = useState(0);
  const [currentDist, setCurrentDist] = useState<EmotionDist>(emptyDist);
  const [maskLabel, setMaskLabel] = useState<Emotion>("Happiness");
  const [cumulative, setCumulative] = useState<EmotionDist>(emptyDist);
  const [totalFrames, setTotalFrames] = useState(0);
  const [leakageRisk, setLeakageRisk] = useState(0);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [spikes, setSpikes] = useState<MicroSpike[]>([]);
  const [log, setLog] = useState<SessionLogEntry[]>([]);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [box, setBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [sessionId] = useState(() => makeSessionId());

  /* ---------------------------------------------------------------- *
   * Model loading (M2/M3 weights)
   * ---------------------------------------------------------------- */
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
        setState("READY");
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

  /* ---------------------------------------------------------------- *
   * Spike detector
   *
   * A micro-expression = a rapid, involuntary burst of a *non-dominant*
   * emotion. We track the rising edge of every non-dominant emotion that
   * crosses SPIKE_ONSET; if it returns below SPIKE_RESOLVE*peak within
   * MICRO_MAX_MS, we emit a MicroSpike. Otherwise it's reclassified as a
   * slow transition (not a micro-expression).
   * ---------------------------------------------------------------- */
  const detectSpike = useCallback(
    (
      dist: EmotionDist,
      maskLabel: Emotion,
      nowMs: number,
      tSec: number,
      snapshot: string | undefined,
    ): MicroSpike | null => {
      const baseline = spikeBaselineRef.current;
      // EMA baseline per emotion so the gate adapts to the subject.
      for (const k of EMOTIONS) {
        baseline[k] = baseline[k] * 0.92 + dist[k] * 0.08;
      }

      const st = spikeRef.current;
      // Resolve an in-flight spike if it has decayed or timed out.
      if (st.rising) {
        const e = st.rising;
        const v = dist[e];
        const elapsed = nowMs - st.riseStart;
        const decayed = v < st.peak * SPIKE_RESOLVE || v < SPIKE_ONSET * 0.7;
        const timedOut = elapsed > MICRO_MAX_MS;
        if (decayed || timedOut) {
          const durationMs = Math.min(elapsed, MICRO_MAX_MS);
          const isLeakage =
            LEAKAGE_EMOTIONS.includes(e) &&
            POSITIVE_MASK.includes(maskLabel);
          const spike: MicroSpike | null =
            st.peak >= SPIKE_ONSET && durationMs >= 40
              ? {
                  id: `${nowMs}-${e}`,
                  t: tSec,
                  emotion: e,
                  peak: st.peak,
                  durationMs,
                  isLeakage,
                  snapshot,
                }
              : null;
          st.rising = null;
          st.peak = 0;
          return spike;
        }
        // still rising — update peak
        if (v > st.peak) {
          st.peak = v;
          st.peakAt = nowMs;
        }
        return null;
      }

      // No in-flight spike: look for a rising edge on a non-dominant emotion.
      // Pick the strongest candidate above the gate that is NOT the mask.
      let candidate: Emotion | null = null;
      let candidateV = SPIKE_ONSET;
      for (const k of EMOTIONS) {
        if (k === maskLabel) continue;
        const v = dist[k];
        const above = v - baseline[k];
        if (v >= candidateV && above > 0.08) {
          candidate = k;
          candidateV = v;
        }
      }
      if (candidate) {
        st.rising = candidate;
        st.riseStart = nowMs;
        st.peak = candidateV;
        st.peakAt = nowMs;
        st.baseline = baseline[candidate];
      }
      return null;
    },
    [],
  );

  /* ---------------------------------------------------------------- *
   * Leakage risk (0..100)
   * Count weighted leakage spikes in the trailing LEAK_WINDOW_MS.
   * ---------------------------------------------------------------- */
  const computeLeakageRisk = useCallback((spikeList: MicroSpike[]): number => {
    const now = performance.now();
    const cutoff = now - startedAtRef.current - LEAK_WINDOW_MS;
    let score = 0;
    for (const s of spikeList) {
      if (!s.isLeakage) continue;
      const age = s.t - cutoff / 1000;
      if (age < 0) continue;
      // weight by peak intensity and recency (linear decay over the window)
      const recency = Math.max(0, 1 - age / (LEAK_WINDOW_MS / 1000));
      score += s.peak * recency * 35;
    }
    return Math.min(100, Math.round(score));
  }, []);

  /* ---------------------------------------------------------------- *
   * Throttled UI flush (~10 Hz) — copies the live ref into React state.
   * Defined before `loop` so the frame loop can call it.
   * ---------------------------------------------------------------- */
  const flushToState = useCallback(() => {
    const live = liveRef.current;
    setFps(live.fps);
    setLatencyMs(live.latencyMs);
    setBufferFill(live.bufferFill);
    setNoFaceWarning(live.noFace);
    setCurrentLabel(live.label);
    setCurrentConf(live.conf);
    setCurrentDist({ ...live.dist });
    setMaskLabel(live.maskLabel);
    setCumulative({ ...live.cumulative });
    setTotalFrames(live.totalFrames);
    setLeakageRisk(live.leakageRisk);
    setTimeline([...live.timeline]);
    setSpikes([...live.spikes]);
    setLog([...live.log]);
    setSnapshots([...live.snapshots]);
    setBox(live.box);
  }, []);

  /* ---------------------------------------------------------------- *
   * Frame loop (M1 → M6)
   * ---------------------------------------------------------------- */
  const loop = useCallback(() => {
    const tick = async () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2 || v.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const frameStart = performance.now();

      // M2 + M3: face detection + expression net (single face)
      let detection: faceapi.WithFaceExpressions<
        faceapi.WithFaceDetection<object>
      > | null = null;
      try {
        detection = await faceapi
          .detectSingleFace(
            v,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.4,
            }),
          )
          .withFaceExpressions();
      } catch {
        /* swallow transient inference errors */
      }

      const live = liveRef.current;
      const nowMs = performance.now();
      const tSec = startedAtRef.current
        ? (nowMs - startedAtRef.current) / 1000
        : 0;

      // size canvas to video
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d");

      if (detection) {
        framesSinceFaceRef.current = 0;
        live.noFace = false;
        const frame = mapFaceApiToEkman(detection.expressions);

        // M4: push to sliding window
        seqBufferRef.current.push(frame.dist);
        if (seqBufferRef.current.length > SEQ_WINDOW)
          seqBufferRef.current.shift();
        live.bufferFill = seqBufferRef.current.length;

        // M5: temporal integration (LSTM stand-in) — average over window
        const avg = averageDist(seqBufferRef.current);
        let mask: Emotion = "Happiness";
        let maskConf = -1;
        for (const k of EMOTIONS) {
          if (avg[k] > maskConf) {
            maskConf = avg[k];
            mask = k;
          }
        }
        live.maskLabel = mask;
        live.label = frame.label;
        live.conf = frame.conf;
        live.dist = frame.dist;
        live.box = detection.detection.box;
        lastBoxRef.current = detection.detection.box;

        // cumulative + total
        live.cumulative = { ...live.cumulative, [mask]: live.cumulative[mask] + 1 };
        live.totalFrames = frameCounterRef.current + 1;

        // M6 spike detection — capture a snapshot for significant spikes
        let snapForSpike: string | undefined;
        const rising = spikeRef.current.rising;
        if (rising && !live.snapshots.includes(rising)) {
          snapForSpike = captureSnapshot(v, detection.detection.box);
        }
        const spike = detectSpike(frame.dist, mask, nowMs, tSec, snapForSpike);
        if (spike) {
          live.spikes = [spike, ...live.spikes].slice(0, SPIKES_MAX);
          live.leakageRisk = computeLeakageRisk(live.spikes);
        }

        // timeline point (pushed at UI refresh rate below)
        // (stored into timeline during UI push)

        // draw bounding box + label on the overlay canvas
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          const box = detection.detection.box;
          const color = EMOTION_COLOR[mask];
          drawBox(ctx, box, color, `${mask.toUpperCase()} · ${Math.round(frame.conf * 100)}%`);
        }

        // periodic session log entry (every ~40 frames, high conf)
        if (
          frame.conf > 0.5 &&
          frameCounterRef.current > 0 &&
          frameCounterRef.current % 40 === 0
        ) {
          const snap = captureSnapshot(v, detection.detection.box);
          live.log = [
            { t: tSec, emotion: mask, conf: frame.conf, snapshot: snap },
            ...live.log,
          ].slice(0, LOG_MAX);
        }
      } else {
        framesSinceFaceRef.current += 1;
        if (framesSinceFaceRef.current >= 2) live.noFace = true;
        lastBoxRef.current = null;
        live.box = null;
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }

      // manual snapshot request
      if (snapshotRequestedRef.current && lastBoxRef.current) {
        snapshotRequestedRef.current = false;
        const snap = captureSnapshot(v, lastBoxRef.current);
        if (snap) {
          live.snapshots = [snap, ...live.snapshots].slice(0, SNAPSHOTS_MAX);
        }
      }

      // latency + fps bookkeeping
      const frameEnd = performance.now();
      latencyAccumRef.current += frameEnd - frameStart;
      latencyCountRef.current += 1;
      frameCounterRef.current += 1;
      fpsCounterRef.current += 1;
      const dt = frameEnd - lastFpsTickRef.current;
      if (dt >= 1000) {
        live.fps = Math.round((fpsCounterRef.current * 1000) / dt);
        live.latencyMs = Math.round(
          latencyAccumRef.current / Math.max(1, latencyCountRef.current),
        );
        fpsCounterRef.current = 0;
        latencyAccumRef.current = 0;
        latencyCountRef.current = 0;
        lastFpsTickRef.current = frameEnd;
      }

      // throttled UI push (~10 Hz) — also append a timeline point
      if (frameEnd - lastUiPushRef.current >= 100) {
        lastUiPushRef.current = frameEnd;
        if (detection) {
          live.timeline = [
            ...live.timeline,
            {
              t: tSec,
              dist: live.dist,
              dominant: live.label ?? mask,
              conf: live.conf,
              maskLabel: live.maskLabel,
            },
          ].slice(-TIMELINE_MAX);
        }
        flushToState();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [detectSpike, computeLeakageRisk, flushToState]);

  /* ---------------------------------------------------------------- *
   * Session control
   * ---------------------------------------------------------------- */
  const start = useCallback(async () => {
    if (!modelReady) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = stream;
      await v.play();
      // reset state
      startedAtRef.current = performance.now();
      lastFpsTickRef.current = performance.now();
      frameCounterRef.current = 0;
      fpsCounterRef.current = 0;
      framesSinceFaceRef.current = 0;
      seqBufferRef.current = [];
      spikeRef.current = {
        rising: null,
        riseStart: 0,
        peak: 0,
        peakAt: 0,
        baseline: 0,
      };
      spikeBaselineRef.current = emptyDist();
      lastUiPushRef.current = 0;
      liveRef.current = {
        fps: 0,
        latencyMs: 0,
        bufferFill: 0,
        noFace: false,
        label: null,
        conf: 0,
        dist: emptyDist(),
        maskLabel: "Happiness",
        cumulative: emptyDist(),
        totalFrames: 0,
        leakageRisk: 0,
        timeline: [],
        spikes: [],
        log: [],
        snapshots: [],
        box: null,
      };
      flushToState();
      setState("PROCESSING");
      loop();
    } catch (e) {
      setError(
        (e as Error).message ||
          "Camera access denied. Grant webcam permission and retry.",
      );
      setState("ERROR");
    }
  }, [modelReady, loop, flushToState]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) v.srcObject = null;
    setState((prev) => (prev === "ERROR" ? prev : "READY"));
  }, []);

  const requestSnapshot = useCallback(() => {
    snapshotRequestedRef.current = true;
  }, []);

  useEffect(() => () => stop(), [stop]);

  /* ---------------------------------------------------------------- *
   * Public surface
   * ---------------------------------------------------------------- */
  return {
    // refs
    videoRef,
    canvasRef,
    // control
    state,
    error,
    modelReady,
    sessionId,
    start,
    stop,
    requestSnapshot,
    // live metrics
    fps,
    latencyMs,
    bufferFill,
    noFaceWarning,
    currentLabel,
    currentConf,
    currentDist,
    maskLabel,
    cumulative,
    totalFrames,
    leakageRisk,
    timeline,
    spikes,
    log,
    snapshots,
    box,
  };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function makeSessionId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `SESS-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function captureSnapshot(
  v: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
): string | undefined {
  try {
    const snap = document.createElement("canvas");
    const w = 320;
    snap.width = w;
    snap.height = Math.round((v.videoHeight / v.videoWidth) * w);
    const sctx = snap.getContext("2d");
    if (!sctx) return undefined;
    sctx.drawImage(v, 0, 0, snap.width, snap.height);
    const scale = snap.width / v.videoWidth;
    sctx.strokeStyle = "rgba(255,255,255,0.9)";
    sctx.lineWidth = 2;
    sctx.strokeRect(
      box.x * scale,
      box.y * scale,
      box.width * scale,
      box.height * scale,
    );
    return snap.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  color: string,
  labelText: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  // corner-bracket style for a forensic look
  const len = Math.min(box.width, box.height) * 0.22;
  const { x, y, width, height } = box;
  ctx.beginPath();
  // top-left
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  // top-right
  ctx.moveTo(x + width - len, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + len);
  // bottom-right
  ctx.moveTo(x + width, y + height - len); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - len, y + height);
  // bottom-left
  ctx.moveTo(x + len, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - len);
  ctx.stroke();

  ctx.font = "600 22px ui-monospace, 'JetBrains Mono', monospace";
  const tw = ctx.measureText(labelText).width + 22;
  const ty = y + height + 8;
  ctx.fillStyle = color;
  ctx.fillRect(x, ty, tw, 34);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(labelText, x + 11, ty + 24);
}
