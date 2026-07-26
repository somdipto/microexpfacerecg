import { jsPDF } from "jspdf";
import { STAGES, FLOW, RUNTIME, RATIONALE, DEMO_STEPS } from "./architecture-data";

const TEAL: [number, number, number] = [13, 117, 102];
const INK: [number, number, number] = [34, 40, 49];
const MUTED: [number, number, number] = [110, 116, 124];
const PANEL: [number, number, number] = [244, 241, 232];
const CREAM: [number, number, number] = [250, 247, 240];

export function generateArchitecturePdf() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 46;
  const CW = W - M * 2;
  let y = 0;

  const footer = () => {
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "MTCNN > ResNet-50 (512-D) > 2x LSTM 256 > Softmax x 7",
      M,
      H - 24,
    );
    doc.text("AIT · CSE · 2025-26", W - M, H - 24, { align: "right" });
  };

  const header = (label: string) => {
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, W, 58, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text("MICRO-EXPRESSION RECOGNITION SYSTEM · ARCHITECTURE REPORT", M, 26);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M, 42);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.8);
    doc.line(M, 50, W - M, 50);
    y = 84;
  };

  const newPage = (label: string) => {
    footer();
    doc.addPage();
    header(label);
  };

  const ensure = (need: number, label: string) => {
    if (y + need > H - 46) newPage(label);
  };

  const h2 = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(text, M, y);
    y += 18;
  };

  const body = (text: string, size = 9.5, color = MUTED) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CW) as string[];
    lines.forEach((l) => {
      doc.text(l, M, y);
      y += size + 3.5;
    });
  };

  // ---------- Page 1: cover ----------
  header("Overview");

  doc.setFont("times", "normal");
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  doc.text("How a frame becomes an emotion", M, y + 14);
  y += 44;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc
    .splitTextToSize(
      "This report documents the complete CNN-LSTM micro-expression recognition pipeline as implemented in the live investigator console. Each module (M1 through M6) is listed in execution order with its purpose, internal operations, and input/output contract, followed by runtime characteristics and a reproducible demonstration script.",
      CW,
    )
    .forEach((l: string) => {
      doc.text(l, M, y);
      y += 14;
    });
  y += 12;

  // flow diagram
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("END-TO-END DATA FLOW", M, y);
  y += 12;

  let fx = M;
  let fy = y;
  doc.setFontSize(7.5);
  FLOW.forEach((node, i) => {
    const w = doc.getTextWidth(node) + 16;
    if (fx + w > W - M) {
      fx = M;
      fy += 26;
    }
    doc.setFillColor(...PANEL);
    doc.setDrawColor(215, 210, 198);
    doc.roundedRect(fx, fy, w, 18, 3, 3, "FD");
    doc.setTextColor(...INK);
    doc.setFont("courier", "normal");
    doc.text(node, fx + 8, fy + 12);
    fx += w;
    if (i < FLOW.length - 1) {
      doc.setTextColor(...TEAL);
      doc.text(">", fx + 3, fy + 12);
      fx += 14;
    }
  });
  y = fy + 36;

  // runtime table
  h2("Runtime characteristics");
  RUNTIME.forEach(([k, v], i) => {
    ensure(22, "Overview");
    if (i % 2 === 0) {
      doc.setFillColor(...CREAM);
      doc.rect(M, y - 9, CW, 19, "F");
    }
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text(k, M + 6, y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(v, M + 160, y + 3.5);
    y += 19;
  });
  y += 16;

  // rationale
  ensure(120, "Overview");
  h2("Design rationale");
  RATIONALE.forEach(([q, a]) => {
    ensure(56, "Overview");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(q, M, y);
    y += 14;
    body(a);
    y += 8;
  });

  // ---------- Module pages ----------
  STAGES.forEach((s, idx) => {
    newPage(`Module ${s.id}`);

    doc.setFillColor(...TEAL);
    doc.roundedRect(M, y - 12, 74, 20, 3, 3, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`STEP ${idx + 1} · ${s.id}`, M + 8, y + 1.5);

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(s.tech, W - M, y + 1.5, { align: "right" });
    y += 30;

    doc.setFont("times", "normal");
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    doc.text(s.title, M, y);
    y += 24;

    body(s.what, 10, INK);
    y += 14;

    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("WHAT HAPPENS, IN ORDER", M, y);
    y += 14;

    s.how.forEach((step, i) => {
      ensure(30, `Module ${s.id}`);
      doc.setFillColor(...TEAL);
      doc.circle(M + 5, y - 3, 5, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), M + 5, y - 1, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(step, CW - 22) as string[];
      lines.forEach((l, li) => {
        doc.text(l, M + 20, y + li * 13);
      });
      y += lines.length * 13 + 8;
    });

    y += 10;
    ensure(70, `Module ${s.id}`);
    doc.setFillColor(...PANEL);
    doc.setDrawColor(215, 210, 198);
    doc.roundedRect(M, y, CW, 58, 4, 4, "FD");
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("INPUT", M + 12, y + 18);
    doc.text("OUTPUT", M + CW / 2 + 12, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc
      .splitTextToSize(s.io[0], CW / 2 - 24)
      .forEach((l: string, i: number) => doc.text(l, M + 12, y + 34 + i * 12));
    doc
      .splitTextToSize(s.io[1], CW / 2 - 24)
      .forEach((l: string, i: number) =>
        doc.text(l, M + CW / 2 + 12, y + 34 + i * 12),
      );
    y += 74;
  });

  // ---------- Demo page ----------
  newPage("Demonstration");
  h2("Live demonstration · run-through");
  body(
    "Follow these steps in order to reproduce the result shown in the investigator console.",
  );
  y += 12;

  DEMO_STEPS.forEach((s, i) => {
    ensure(34, "Demonstration");
    doc.setFillColor(...TEAL);
    doc.circle(M + 7, y - 3, 7, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), M + 7, y, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(s, CW - 28) as string[];
    lines.forEach((l, li) => doc.text(l, M + 24, y + li * 13.5));
    y += lines.length * 13.5 + 12;
  });

  y += 10;
  ensure(60, "Demonstration");
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${new Date().toLocaleString()} · all inference performed locally on-device`,
    M,
    y,
  );

  footer();
  doc.save("architecture_report.pdf");
}
