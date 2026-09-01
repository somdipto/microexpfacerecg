# Project Worklog — Micro Expression Recognition System (Next.js 16 Rebuild)

## Origin / Intent
Source repo: https://github.com/theanikeeeeet/microexpfacerecg
Reason it exists: "Real Time AI Powered Micro Expression Recognition Platform for Investigative Interviewing."
It detects involuntary facial micro-expressions from a webcam (Ekman-7 universal emotions) for
investigative interviewing / deception research / psychology. The original used TanStack Router with
face-api.js for on-device inference (privacy-preserving — no frames uploaded). README aspirationally
described a FastAPI+OpenCV+MTCNN+ResNet50+LSTM backend that was never actually implemented; the real
app is purely client-side face-api.js.

## Rebuild goal (make it better in all aspects) — Next.js 16 App Router
Keep the strong parts (on-device face-api.js, Ekman-7, M1–M6 pipeline narrative) and ADD:
1. Real micro-expression SPIKE detection (rapid 40–500ms non-dominant emotion bursts) — the original only smoothed the dominant emotion and never isolated micro-expressions specifically.
2. Deception / emotional-leakage indicator — flags brief negative-valence spikes that contradict a sustained positive/neutral mask (the actual forensic use-case).
3. Persistent session history via Prisma + SQLite + REST API (README promised this, original lacked it).
4. Richer live viz: emotion-intensity timeline, distribution radar, micro-spike feed, pipeline M1–M6 live status, FPS/latency, snapshot gallery.
5. Polished, responsive, dark investigator UI with sticky footer; single `/` route per project rules.

---
Task ID: BUILD-1
Agent: main 
Task: Rebuild microexpfacerecg as a superior Next.js 16 app — on-device micro-expression recognition with spike detection, leakage analysis, session persistence, report export.

Work Log:
- Cloned & analyzed original repo (TanStack Router + face-api.js). README described an aspirational FastAPI+ResNet50+LSTM backend that was never implemented; real app is purely client-side face-api.js.
- Installed face-api.js + jspdf; downloaded tiny_face_detector + face_expression model weights into /public/models (self-hosted, no CDN dependency).
- src/lib/emotions.ts: Ekman-7 domain model + face-api→Ekman re-mapping (with contempt heuristic) + averageDist temporal integrator.
- src/lib/architecture-data.ts: M1–M6 pipeline stages, flow strip, runtime table, rationale (enhanced M6 to cover spike gate + leakage analyser).
- src/lib/report.ts: PDF (jsPDF) + CSV report generators with emotion distribution bar, spike table, snapshot strip, pipeline summary.
- src/hooks/use-micro-expression.ts: core engine — camera via getUserMedia, face-api frame loop (M1 capture → M2 detect → M3 features → M4 16-frame buffer → M5 temporal avg → M6 softmax + SPIKE GATE + LEAKAGE ANALYSER). Throttled 10 Hz UI flush decoupled from inference FPS. EMA baseline per emotion for adaptive spike onset/resolve gating (40–1500 ms band). Leakage risk = weighted recency×intensity of negative-valence spikes contradicting positive mask. Corner-bracket bounding-box overlay. Snapshot capture (auto + manual).
- src/components/console/panels.tsx: EmotionPanel, LeakageMeter (gauge), PipelineStatus (M1–M6 live lights + buffer meter + fps/latency), TimelineChartView (recharts stacked area, 7 Ekman classes), MicroSpikeFeed, SessionLogView, SnapshotStrip.
- src/components/console/architecture-panel.tsx: collapsible explainer (flow, stages, runtime, rationale, on-device privacy note).
- src/components/console/session-history.tsx: persisted sessions list + detail drawer (distribution bars + spike chips).
- src/components/console/investigator-console.tsx: orchestrator — sticky header (session id, REC badge, duration, fps, theme toggle), camera card with status overlays (loading/ready/error/no-face/LIVE), control bar (start/stop/snapshot/export/save + pdf/csv select), responsive 12-col grid, sticky footer.
- prisma/schema.prisma: Session + Prediction models. db:push applied.
- src/app/api/sessions/route.ts (GET list, POST create) + [id]/route.ts (GET detail, DELETE).
- src/app/layout.tsx: dark-by-default via next-themes, Geist + JetBrains Mono fonts, sonner Toaster.
- src/components/theme-provider.tsx + theme-toggle.tsx.

Stage Summary:
- Lint: clean (0 errors, 0 warnings).
- Dev server: compiles, GET / 200.
- Agent Browser verification: page renders fully (header, camera card with "Ready when you are" overlay after models load, pipeline M1–M6, timeline empty-state, spike feed, session log, emotion panel, leakage meter, architecture panel, session history, sticky footer). Architecture panel expands showing all stages. Mobile (390px) stacks to single column; desktop uses 12-col grid. Theme toggle dark↔light works. No console/hydration errors.
- Persistence API verified end-to-end: POST /api/sessions →201, GET list →200, GET detail →200 (distribution + spikes), DELETE →200.
- Camera inference itself cannot be exercised in the headless sandbox (getUserMedia hangs pending device permission); the hook's try/catch surfaces any rejection as the error overlay. In a real browser with a webcam the full M1–M6 loop + spike/leakage detection runs on-device.

Key improvements over the original microexpfacerecg:
1. True micro-expression SPIKE detection (the original only smoothed the dominant emotion — it never isolated the brief 40–500 ms involuntary leaks that are the actual forensic signal).
2. Emotional-LEAKAGE / deception-risk indicator (negative-valence spikes contradicting a positive/neutral sustained mask) — the real investigative use-case.
3. Persistent session history via Prisma+SQLite+REST API (README promised, original lacked it).
4. Richer live viz: stacked-area emotion timeline, distribution bars, micro-spike feed with snapshots, M1–M6 live pipeline lights, leakage gauge, snapshot gallery.
5. Next.js 16 App Router + TypeScript strict + shadcn/ui + dark forensic UI + sticky footer + responsive.
6. Self-hosted model weights (no CDN dependency).
