"use client";

import { useState } from "react";
import { ChevronDown, Cpu, Lock, Network, Workflow } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FLOW, RATIONALE, RUNTIME, STAGES } from "@/lib/architecture-data";

export function ArchitecturePanel() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-4">
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between text-left"
            aria-expanded={open}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Workflow className="h-4 w-4" />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  System Architecture
                </div>
                <h3 className="font-serif text-lg font-semibold tracking-tight">
                  How a frame becomes an emotion
                </h3>
                <p className="text-xs text-muted-foreground">
                  The M1 → M6 pipeline, runtime characteristics, and design rationale.
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-6">
          {/* flow */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              End-to-end data flow
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              {FLOW.map((n, i) => (
                <span key={n} className="flex items-center gap-1.5">
                  <span className="rounded-md border border-border bg-card px-2 py-1">
                    {n}
                  </span>
                  {i < FLOW.length - 1 && (
                    <span className="text-primary">→</span>
                  )}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The loop repeats ~10–30 times per second with end-to-end latency under
              500 ms. No image is uploaded — inference runs entirely in the browser.
            </p>
          </div>

          {/* stages */}
          <ol className="space-y-3">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                        Step {i + 1} · {s.id}
                      </div>
                      <h4 className="font-serif text-lg font-semibold tracking-tight">
                        {s.title}
                      </h4>
                    </div>
                    <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                      {s.tech}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{s.what}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1.6fr_1fr]">
                    <ul className="space-y-1">
                      {s.how.map((h) => (
                        <li
                          key={h}
                          className="flex gap-2 text-xs text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-md border border-border bg-muted/30 p-2.5">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        Input → Output
                      </div>
                      <div className="mt-1 font-mono text-[11px]">
                        <div className="text-muted-foreground">in</div>
                        <div>{s.io[0]}</div>
                        <div className="mt-1.5 text-muted-foreground">out</div>
                        <div>{s.io[1]}</div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* runtime */}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                Runtime characteristics
              </span>
            </div>
            <dl className="mt-3 divide-y divide-border">
              {RUNTIME.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2 md:grid-cols-[220px_1fr]">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* rationale */}
          <div className="grid gap-3 md:grid-cols-2">
            {RATIONALE.map(([t, d]) => (
              <div key={t} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <h4 className="font-serif text-base font-semibold">{t}</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {d}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                On-device by design.
              </strong>{" "}
              Faces are biometric data. Every frame is processed in your browser —
              no pixel is ever transmitted to a server. Only anonymised session
              summaries (emotion counts, spike timestamps) are optionally saved.
            </span>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
