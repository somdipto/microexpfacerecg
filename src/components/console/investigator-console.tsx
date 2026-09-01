"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Circle,
  Download,
  FileText,
  Loader2,
  Play,
  Save,
  Square,
  ScanFace,
  Brain,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { useMicroExpression } from "@/hooks/use-micro-expression";
import { emptyDist } from "@/lib/emotions";
import { exportCsvReport, exportPdfReport } from "@/lib/report";
import {
  EmotionPanel,
  LeakageMeter,
  MicroSpikeFeed,
  PipelineStatus,
  SessionLogView,
  SnapshotStrip,
  TimelineChartView,
} from "@/components/console/panels";
import { ArchitecturePanel } from "@/components/console/architecture-panel";
import { SessionHistory } from "@/components/console/session-history";
import { ThemeToggle } from "@/components/theme-toggle";

export function InvestigatorConsole() {
  const me = useMicroExpression();
  const [startedAt, setStartedAt] = useState(0);
  const [, setTick] = useState(0);
  const [exportFmt, setExportFmt] = useState<"pdf" | "csv">("pdf");
  const [saving, setSaving] = useState(false);

  // live duration timer (10 Hz)
  useEffect(() => {
    if (me.state !== "PROCESSING") return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [me.state]);

  const durationSec = startedAt && me.state === "PROCESSING"
    ? (Date.now() - startedAt) / 1000
    : 0;

  const totalCumulative = useMemo(
    () => Object.values(me.cumulative).reduce((a, b) => a + b, 0),
    [me.cumulative],
  );

  const handleStart = async () => {
    setStartedAt(Date.now());
    await me.start();
  };

  const handleStop = () => {
    me.stop();
  };

  const handleSnapshot = () => {
    me.requestSnapshot();
    toast.success("Snapshot queued");
  };

  const handleExport = () => {
    if (totalCumulative === 0) {
      toast.error("Run a session before exporting");
      return;
    }
    const payload = {
      sessionId: me.sessionId,
      durationSec,
      cumulative: me.cumulative,
      totalCumulative,
      totalFrames: me.totalFrames,
      leakageRisk: me.leakageRisk,
      maskLabel: me.maskLabel,
      timeline: me.timeline,
      spikes: me.spikes,
      log: me.log,
    };
    if (exportFmt === "pdf") {
      exportPdfReport(payload);
      toast.success("PDF report exported");
    } else {
      exportCsvReport(payload);
      toast.success("CSV report exported");
    }
  };

  const handleSave = async () => {
    if (totalCumulative === 0) {
      toast.error("Nothing to save yet");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: me.sessionId,
          source: "webcam",
          durationSec,
          totalFrames: me.totalFrames,
          leakageRisk: me.leakageRisk,
          maskLabel: me.maskLabel,
          distribution: me.cumulative,
          spikes: me.spikes,
        }),
      });
      if (res.ok) {
        toast.success("Session saved to history");
      } else {
        toast.error("Failed to save session");
      }
    } catch {
      toast.error("Failed to save session");
    } finally {
      setSaving(false);
    }
  };

  const isReady = me.state === "READY";
  const isProcessing = me.state === "PROCESSING";
  const isLoading = me.state === "LOADING";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ---------------------------------------------------------- Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanFace className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-serif text-lg font-semibold leading-tight tracking-tight">
                Micro-Expression Investigator Console
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                CNN · LSTM · Ekman-7 · on-device
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {me.sessionId}
            </Badge>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] ${
                isProcessing
                  ? "border-rose-500/40 text-rose-500"
                  : "text-muted-foreground"
              }`}
            >
              <Circle
                className={`mr-1 h-2 w-2 ${
                  isProcessing ? "animate-pulse fill-rose-500 text-rose-500" : ""
                }`}
              />
              {isProcessing ? "REC" : "IDLE"}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {formatDuration(durationSec)}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {me.fps} fps · {me.latencyMs} ms
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- Body */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-12">
          {/* ---- Camera column ---- */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="overflow-hidden p-0">
              <div className="relative aspect-video w-full bg-black">
                <video
                  ref={me.videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <canvas
                  ref={me.canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
                {/* status overlays */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-center">
                    <div className="space-y-2 text-white">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      <p className="font-mono text-xs uppercase tracking-[0.2em]">
                        Loading on-device models…
                      </p>
                      <p className="font-mono text-[10px] text-white/60">
                        tiny_face_detector · face_expression_net
                      </p>
                    </div>
                  </div>
                )}
                {isReady && !isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="text-center text-white">
                      <Brain className="mx-auto mb-2 h-8 w-8 text-primary" />
                      <p className="font-serif text-lg font-semibold">
                        Ready when you are
                      </p>
                      <p className="font-mono text-[10px] text-white/70">
                        Press Start Live Analysis to begin
                      </p>
                    </div>
                  </div>
                )}
                {me.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center">
                    <div className="space-y-2 text-white">
                      <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
                      <p className="font-mono text-xs uppercase tracking-wider text-rose-400">
                        {me.error}
                      </p>
                    </div>
                  </div>
                )}
                {me.noFaceWarning && isProcessing && (
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
                      No face detected — predictions suppressed
                    </span>
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-rose-500/50 bg-rose-500/20 px-2.5 py-1">
                    <Circle className="h-2 w-2 animate-pulse fill-rose-500 text-rose-500" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-rose-200">
                      Live
                    </span>
                  </div>
                )}
              </div>
              {/* control bar */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={!isReady || isProcessing}
                  className="gap-1.5"
                >
                  <Play className="h-4 w-4" />
                  Start Live Analysis
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStop}
                  disabled={!isProcessing}
                  className="gap-1.5"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSnapshot}
                  disabled={!isProcessing}
                  className="gap-1.5"
                >
                  <Camera className="h-4 w-4" />
                  Snapshot
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Select value={exportFmt} onValueChange={(v) => setExportFmt(v as "pdf" | "csv")}>
                    <SelectTrigger className="h-8 w-[90px] font-mono text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExport}
                    disabled={totalCumulative === 0}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSave}
                    disabled={totalCumulative === 0 || saving}
                    className="gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </Card>

            <PipelineStatus
              running={isProcessing}
              bufferFill={me.bufferFill}
              fps={me.fps}
              latencyMs={me.latencyMs}
            />

            <TimelineChartView timeline={me.timeline} />

            <div className="grid gap-4 md:grid-cols-2">
              <MicroSpikeFeed spikes={me.spikes} />
              <SessionLogView log={me.log} />
            </div>

            <SnapshotStrip snapshots={me.snapshots} />
          </div>

          {/* ---- Right analysis column ---- */}
          <aside className="lg:col-span-4 space-y-4">
            <EmotionPanel
              label={me.currentLabel}
              conf={me.currentConf}
              dist={me.currentDist ?? emptyDist()}
              maskLabel={me.maskLabel}
            />
            <LeakageMeter risk={me.leakageRisk} spikeCount={me.spikes.length} />
            <ArchitecturePanel />
            <SessionHistory />
          </aside>
        </div>
      </main>

      {/* ---------------------------------------------------------- Footer */}
      <footer className="mt-auto border-t border-border bg-background/80">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <ScanFace className="h-3.5 w-3.5" />
            Pipeline · TinyFaceDetector → CNN → Buffer 16 → LSTM → Softmax × 7 → Spike gate
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {totalCumulative} frames analyzed
            </span>
            <span className="hidden sm:inline">
              {Object.entries(me.cumulative)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 1)
                .map(([k]) => `dominant · ${k}`)[0] ?? "dominant · —"}
            </span>
            <span>on-device · zero upload</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
