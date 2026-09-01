"use client";

import { jsPDF } from "jspdf";

import {
  EMOTIONS,
  EMOTION_COLOR,
  type Emotion,
  type EmotionDist,
} from "@/lib/emotions";
import { RUNTIME, FLOW } from "@/lib/architecture-data";
import type { MicroSpike, SessionLogEntry, TimelinePoint } from "@/hooks/use-micro-expression";

export interface ReportPayload {
  sessionId: string;
  durationSec: number;
  cumulative: EmotionDist;
  totalCumulative: number;
  totalFrames: number;
  leakageRisk: number;
  maskLabel: Emotion;
  timeline: TimelinePoint[];
  spikes: MicroSpike[];
  log: SessionLogEntry[];
  investigatorNote?: string;
}

export function exportPdfReport(p: ReportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  // --- Header band ---
  doc.setFillColor(18, 20, 26);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Micro-Expression Session Report", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 190, 200);
  doc.text("Confidential — on-device inference. No frames were transmitted.", M, 58);
  doc.text(
    `Session ${p.sessionId}  ·  ${formatDuration(p.durationSec)}  ·  ${p.totalFrames} frames  ·  leakage risk ${p.leakageRisk}/100`,
    M,
    74,
  );

  let y = 120;

  // --- Emotion distribution bar ---
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("1. Dominant Emotion Distribution", M, y);
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, W - M, y);
  y += 16;

  const total = p.totalCumulative || 1;
  const barX = M;
  const barW = W - M * 2;
  const barH = 26;
  let cursor = barX;
  for (const e of EMOTIONS) {
    const frac = p.cumulative[e] / total;
    const segW = barW * frac;
    if (segW > 0) {
      const [r, g, b] = hexToRgb(EMOTION_COLOR[e]);
      doc.setFillColor(r, g, b);
      doc.rect(cursor, y, segW, barH, "F");
      cursor += segW;
    }
  }
  doc.setDrawColor(180, 180, 180);
  doc.rect(M, y, barW, barH, "S");
  y += barH + 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  let legendX = M;
  for (const e of EMOTIONS) {
    const [r, g, b] = hexToRgb(EMOTION_COLOR[e]);
    doc.setFillColor(r, g, b);
    doc.rect(legendX, y, 9, 9, "F");
    doc.text(
      `${e} ${Math.round((p.cumulative[e] / total) * 100)}%`,
      legendX + 13,
      y + 8,
    );
    legendX += 78;
    if (legendX > W - M - 78) {
      legendX = M;
      y += 14;
    }
  }
  y += 24;

  // --- Micro-expression spikes table ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("2. Micro-Expression Spikes", M, y);
  y += 8;
  doc.line(M, y, W - M, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const colX = [M, M + 70, M + 150, M + 260, M + 360, W - M];
  doc.text("#", colX[0], y);
  doc.text("Time", colX[1], y);
  doc.text("Emotion", colX[2], y);
  doc.text("Peak", colX[3], y);
  doc.text("Duration", colX[4], y);
  doc.text("Leakage?", colX[5], y);
  y += 6;
  doc.line(M, y, W - M, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  const shownSpikes = p.spikes.slice(0, 18);
  if (shownSpikes.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text("No micro-expression spikes recorded.", M, y);
    y += 14;
  } else {
    shownSpikes.forEach((s, i) => {
      if (y > H - 60) {
        doc.addPage();
        y = M;
      }
      const [r, g, b] = hexToRgb(EMOTION_COLOR[s.emotion]);
      doc.setFillColor(r, g, b);
      doc.rect(colX[0], y - 8, 5, 10, "F");
      doc.setTextColor(40, 40, 40);
      doc.text(String(i + 1), colX[0] + 10, y);
      doc.text(`${s.t.toFixed(2)}s`, colX[1], y);
      doc.text(s.emotion, colX[2], y);
      doc.text(`${Math.round(s.peak * 100)}%`, colX[3], y);
      doc.text(`${s.durationMs} ms`, colX[4], y);
      doc.setTextColor(s.isLeakage ? 192 : 100, s.isLeakage ? 57 : 120, s.isLeakage ? 43 : 60);
      doc.text(s.isLeakage ? "YES" : "—", colX[5], y);
      y += 14;
    });
  }
  y += 12;

  // --- Snapshot strip (from log) ---
  const snaps = p.log.filter((l) => l.snapshot).slice(0, 4);
  if (y > H - 140) {
    doc.addPage();
    y = M;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("3. Frame Snapshots", M, y);
  y += 8;
  doc.line(M, y, W - M, y);
  y += 16;
  const cellW = (W - M * 2 - 3 * 8) / 4;
  let sx = M;
  for (const l of snaps) {
    try {
      doc.addImage(l.snapshot!, "JPEG", sx, y, cellW, cellW * 0.75);
    } catch {
      /* ignore */
    }
    sx += cellW + 8;
  }
  y += cellW * 0.75 + 16;

  // --- Pipeline summary ---
  if (y > H - 200) {
    doc.addPage();
    y = M;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("4. Pipeline & Runtime", M, y);
  y += 8;
  doc.line(M, y, W - M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`Flow: ${FLOW.join("  →  ")}`, M, y);
  y += 14;
  for (const [k, v] of RUNTIME) {
    doc.setFont("helvetica", "bold");
    doc.text(k, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, M + 150, y, { maxWidth: W - M - (M + 150) });
    y += 14;
  }

  if (p.investigatorNote) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Investigator note:", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(p.investigatorNote, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 13 + 8;
  }

  // --- Footer ---
  doc.setDrawColor(220, 220, 220);
  doc.line(M, H - 40, W - M, H - 40);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "Generated by Investigator Console — CNN+LSTM micro-expression pipeline (on-device).",
    M,
    H - 24,
  );
  doc.text(
    `Exported ${new Date().toLocaleString()}`,
    W - M,
    H - 24,
    { align: "right" },
  );

  doc.save(`microexp-${p.sessionId}.pdf`);
}

export function exportCsvReport(p: ReportPayload) {
  const rows: string[] = [];
  rows.push("# Micro-expression spikes");
  rows.push("index,time_sec,emotion,peak,duration_ms,is_leakage");
  p.spikes.forEach((s, i) => {
    rows.push(
      [i + 1, s.t.toFixed(3), s.emotion, s.peak.toFixed(4), s.durationMs, s.isLeakage ? 1 : 0].join(
        ",",
      ),
    );
  });
  rows.push("");
  rows.push("# Timeline (sampled)");
  rows.push("time_sec,dominant,mask,conf");
  p.timeline.forEach((tp) => {
    rows.push(
      [tp.t.toFixed(3), tp.dominant, tp.maskLabel, tp.conf.toFixed(4)].join(","),
    );
  });
  rows.push("");
  rows.push("# Cumulative distribution");
  rows.push("emotion,count,percent");
  const total = p.totalCumulative || 1;
  for (const e of EMOTIONS) {
    rows.push(
      [e, p.cumulative[e], ((p.cumulative[e] / total) * 100).toFixed(2)].join(","),
    );
  }
  rows.push("");
  rows.push("# Session");
  rows.push(`session_id,${p.sessionId}`);
  rows.push(`duration_sec,${p.durationSec.toFixed(2)}`);
  rows.push(`total_frames,${p.totalFrames}`);
  rows.push(`leakage_risk,${p.leakageRisk}`);
  rows.push(`sustained_mask,${p.maskLabel}`);

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `microexp-${p.sessionId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDuration(sec: number): string {
  if (sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
