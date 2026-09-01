"use client";

import { useEffect, useState } from "react";
import { History, Loader2, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EMOTION_COLOR,
  type Emotion,
} from "@/lib/emotions";

interface SessionSummary {
  id: string;
  sessionId: string;
  source: string;
  durationSec: number;
  totalFrames: number;
  leakageRisk: number;
  maskLabel: string;
  createdAt: string;
}

interface SessionDetail {
  session: SessionSummary & {
    distribution: Record<string, number>;
    spikes: Array<{
      id: string;
      t: number;
      emotion: Emotion;
      peak: number;
      durationMs: number;
      isLeakage: boolean;
    }>;
  };
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      setSessions(json.sessions ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const open = async (id: string) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (res.ok) {
        const json = await res.json();
        setSelected(json);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingDetail(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selected?.session.id === id) setSelected(null);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Saved Sessions
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="h-7 font-mono text-[10px]"
        >
          Refresh
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Persisted on-device. Only anonymised summaries are stored — never frames.
      </p>

      {loading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex h-16 items-center justify-center text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Run &amp; save a session to see history
          </p>
        </div>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => open(s.id)}
              className="flex w-full items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: EMOTION_COLOR[s.maskLabel as Emotion] ?? "#6b6b6b",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-semibold truncate">
                  {s.sessionId}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {Math.round(s.durationSec)}s · {s.totalFrames} frames · risk {s.leakageRisk}
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[9px]">
                {new Date(s.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(s.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    remove(s.id);
                  }
                }}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <SessionDetailCard detail={selected} loading={loadingDetail} onClose={() => setSelected(null)} />
      )}
    </Card>
  );
}

function SessionDetailCard({
  detail,
  loading,
  onClose,
}: {
  detail: SessionDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (loading || !detail) return null;
  const s = detail.session;
  const dist = s.distribution ?? {};
  const total = Object.values(dist).reduce((a, b) => a + (b as number), 0) || 1;
  return (
    <div className="mt-2 rounded-md border border-primary/40 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
          Session detail
        </span>
        <button
          onClick={onClose}
          className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          close ✕
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div>
          duration: <span className="font-semibold">{Math.round(s.durationSec)}s</span>
        </div>
        <div>
          frames: <span className="font-semibold">{s.totalFrames}</span>
        </div>
        <div>
          mask: <span className="font-semibold">{s.maskLabel}</span>
        </div>
        <div>
          leakage: <span className="font-semibold">{s.leakageRisk}/100</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          distribution
        </div>
        <div className="mt-1 space-y-1">
          {Object.entries(dist).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-20 font-mono text-[10px] uppercase text-muted-foreground">
                {k}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${((v as number) / total) * 100}%`,
                    backgroundColor:
                      EMOTION_COLOR[k as Emotion] ?? "#6b6b6b",
                  }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                {Math.round(((v as number) / total) * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {s.spikes.length > 0 && (
        <div className="mt-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {s.spikes.length} spikes
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {s.spikes.slice(0, 16).map((sp) => (
              <span
                key={sp.id}
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[9px]"
                style={{ color: EMOTION_COLOR[sp.emotion] }}
              >
                {sp.emotion}
                {sp.isLeakage && (
                  <span className="rounded bg-rose-500/15 px-0.5 text-rose-500">
                    L
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
