"use client";

import {
  Activity,
  AlertTriangle,
  Camera,
  Cpu,
  Crop,
  Layers,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  EMOTIONS,
  EMOTION_COLOR,
  EMOTION_GLYPH,
  type Emotion,
  type EmotionDist,
} from "@/lib/emotions";
import type {
  MicroSpike,
  SessionLogEntry,
  TimelinePoint,
} from "@/hooks/use-micro-expression";

/* ------------------------------------------------------------------ *
 * EmotionPanel — current dominant emotion + 7-way distribution
 * ------------------------------------------------------------------ */
export function EmotionPanel({
  label,
  conf,
  dist,
  maskLabel,
}: {
  label: Emotion | null;
  conf: number;
  dist: EmotionDist;
  maskLabel: Emotion;
}) {
  const color = label ? EMOTION_COLOR[label] : "#6b6b6b";
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Current Emotion
        </span>
        <Badge variant="outline" className="font-mono text-[10px]">
          mask · {maskLabel}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl font-bold"
          style={{ backgroundColor: `${color}22`, color }}
          aria-hidden
        >
          {label ? EMOTION_GLYPH[label] : "–"}
        </span>
        <div className="min-w-0">
          <div
            className="font-serif text-2xl font-semibold leading-tight truncate"
            style={{ color: label ? color : undefined }}
          >
            {label ?? "Awaiting face"}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {Math.round(conf * 100)}% confidence
          </div>
        </div>
      </div>
      <div className="space-y-1.5 pt-1">
        {EMOTIONS.map((e) => {
          const v = dist[e] ?? 0;
          return (
            <div key={e} className="flex items-center gap-2">
              <span className="w-20 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {e}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-150"
                  style={{
                    width: `${Math.min(100, v * 100)}%`,
                    backgroundColor: EMOTION_COLOR[e],
                  }}
                />
              </div>
              <span className="w-9 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                {Math.round(v * 100)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * LeakageMeter — deception / emotional-leakage risk gauge
 * ------------------------------------------------------------------ */
export function LeakageMeter({
  risk,
  spikeCount,
}: {
  risk: number;
  spikeCount: number;
}) {
  const tone =
    risk < 25
      ? "text-emerald-500"
      : risk < 55
        ? "text-amber-500"
        : "text-rose-500";
  const label =
    risk < 25 ? "Low" : risk < 55 ? "Elevated" : risk < 80 ? "High" : "Critical";
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Leakage Risk
        </span>
        <ShieldAlert className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="flex items-end gap-2">
        <span className={`font-serif text-4xl font-bold tabular-nums ${tone}`}>
          {risk}
        </span>
        <span className="mb-1 font-mono text-xs text-muted-foreground">
          / 100
        </span>
        <Badge variant="outline" className={`mb-1 ml-auto font-mono text-[10px] ${tone}`}>
          {label}
        </Badge>
      </div>
      <Progress value={risk} className="h-2" />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Weighted by negative-valence micro-spikes ({spikeCount} logged) that
        contradict the sustained mask. A forensic cue, not proof of deception.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * PipelineStatus — M1–M6 live lights
 * ------------------------------------------------------------------ */
const STAGE_META = [
  { id: "M1", title: "Input", icon: Camera },
  { id: "M2", title: "Face detect", icon: Crop },
  { id: "M3", title: "CNN features", icon: Cpu },
  { id: "M4", title: "Buffer 16", icon: Layers },
  { id: "M5", title: "LSTM", icon: Activity },
  { id: "M6", title: "Spike + Softmax", icon: Zap },
] as const;

export function PipelineStatus({
  running,
  bufferFill,
  fps,
  latencyMs,
}: {
  running: boolean;
  bufferFill: number;
  fps: number;
  latencyMs: number;
}) {
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Pipeline · M1→M6
        </span>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span>{fps} fps</span>
          <span>{latencyMs} ms</span>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {STAGE_META.map((s, i) => {
          const active = running && i <= 3 + (bufferFill > 0 ? 1 : 0);
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors ${
                active
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
              title={s.title}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="font-mono text-[9px] font-semibold tracking-wider">
                {s.id}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Sequence buffer
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150"
            style={{ width: `${(bufferFill / 16) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {bufferFill}/16
        </span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * TimelineChart — stacked area of emotion intensity over time
 * ------------------------------------------------------------------ */
export function TimelineChartView({
  timeline,
}: {
  timeline: TimelinePoint[];
}) {
  // Build a compact recharts-friendly dataset
  const data = timeline.map((tp) => {
    const row: Record<string, number | string> = { t: Number(tp.t.toFixed(2)) };
    for (const e of EMOTIONS) row[e] = Number((tp.dist[e] * 100).toFixed(1));
    return row;
  });
  const maxT = timeline.length ? timeline[timeline.length - 1].t : 0;
  const minT = timeline.length ? timeline[0].t : 0;

  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Emotion Intensity Timeline
          </span>
          <p className="text-xs text-muted-foreground">
            Per-frame probability of each Ekman-7 class over the trailing ~12 s.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {EMOTIONS.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground"
            >
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: EMOTION_COLOR[e] }}
              />
              {e}
            </span>
          ))}
        </div>
      </div>
      <div className="h-[220px] w-full">
        {data.length === 0 ? (
          <EmptyChartHint />
        ) : (
          <TimelineArea data={data} minT={minT} maxT={maxT} />
        )}
      </div>
    </Card>
  );
}

function EmptyChartHint() {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div className="space-y-1">
        <Activity className="mx-auto h-6 w-6 text-muted-foreground/50" />
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Press Start Live Analysis to populate the timeline
        </p>
      </div>
    </div>
  );
}

// recharts is imported lazily to keep this file self-contained
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function TimelineArea({
  data,
  minT,
  maxT,
}: {
  data: Record<string, number | string>[];
  minT: number;
  maxT: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {EMOTIONS.map((e) => (
            <linearGradient key={e} id={`g-${e}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMOTION_COLOR[e]} stopOpacity={0.65} />
              <stop offset="100%" stopColor={EMOTION_COLOR[e]} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
        <XAxis
          dataKey="t"
          type="number"
          domain={[minT, maxT]}
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          tickFormatter={(v) => `${Number(v).toFixed(0)}s`}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          tickFormatter={(v) => `${v}`}
          domain={[0, 100]}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 11,
          }}
          labelFormatter={(v) => `${Number(v).toFixed(2)}s`}
          formatter={(value: number, name: string) => [
            `${value}%`,
            name,
          ]}
        />
        {EMOTIONS.map((e) => (
          <Area
            key={e}
            type="monotone"
            dataKey={e}
            stackId="1"
            stroke={EMOTION_COLOR[e]}
            strokeWidth={1}
            fill={`url(#g-${e})`}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ *
 * MicroSpikeFeed — recent micro-expression spikes
 * ------------------------------------------------------------------ */
export function MicroSpikeFeed({
  spikes,
}: {
  spikes: MicroSpike[];
}) {
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Micro-Expression Spikes
        </span>
        <Badge variant="outline" className="font-mono text-[10px]">
          {spikes.length} logged
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Rapid 40–500 ms non-dominant bursts — the involuntary leaks a posed
        expression cannot fully suppress.
      </p>
      <div className="max-h-72 overflow-y-auto pr-1 -mr-1">
        {spikes.length === 0 ? (
          <div className="flex h-28 items-center justify-center text-center">
            <div className="space-y-1">
              <Zap className="mx-auto h-5 w-5 text-muted-foreground/50" />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                No spikes yet
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {spikes.map((s) => {
              const color = EMOTION_COLOR[s.emotion];
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2"
                >
                  {s.snapshot ? (
                    
                    <img
                      src={s.snapshot}
                      alt={`spike ${s.emotion}`}
                      className="h-9 w-9 rounded object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded text-sm"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {EMOTION_GLYPH[s.emotion]}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs font-semibold"
                        style={{ color }}
                      >
                        {s.emotion}
                      </span>
                      {s.isLeakage && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1 py-px font-mono text-[9px] font-semibold text-rose-500">
                          <AlertTriangle className="h-2.5 w-2.5" /> LEAK
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      t={s.t.toFixed(2)}s · peak {Math.round(s.peak * 100)}% · {s.durationMs}ms
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * SessionLog — event log with snapshot thumbs
 * ------------------------------------------------------------------ */
export function SessionLogView({ log }: { log: SessionLogEntry[] }) {
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Session Log
        </span>
        <Badge variant="outline" className="font-mono text-[10px]">
          {log.length} entries
        </Badge>
      </div>
      <div className="max-h-72 overflow-y-auto pr-1 -mr-1">
        {log.length === 0 ? (
          <div className="flex h-28 items-center justify-center text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              No log entries yet
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {log.map((l, i) => {
              const color = EMOTION_COLOR[l.emotion];
              return (
                <li
                  key={`${l.t}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2"
                >
                  {l.snapshot ? (
                    
                    <img
                      src={l.snapshot}
                      alt={`frame ${l.emotion}`}
                      className="h-9 w-9 rounded object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded text-sm"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {EMOTION_GLYPH[l.emotion]}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{ color }}
                    >
                      {l.emotion}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      t={l.t.toFixed(2)}s · {Math.round(l.conf * 100)}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * SnapshotStrip — manually captured snapshots
 * ------------------------------------------------------------------ */
export function SnapshotStrip({ snapshots }: { snapshots: string[] }) {
  if (snapshots.length === 0) return null;
  return (
    <Card className="p-4 gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Captured Snapshots
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {snapshots.map((s, i) => (
          
          <img
            key={i}
            src={s}
            alt={`snapshot ${i + 1}`}
            className="h-16 w-16 shrink-0 rounded border border-border object-cover"
          />
        ))}
      </div>
    </Card>
  );
}
