import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** GET /api/sessions — list recent sessions (newest first). */
export async function GET() {
  try {
    const sessions = await db.session.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        sessionId: true,
        source: true,
        durationSec: true,
        totalFrames: true,
        leakageRisk: true,
        maskLabel: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ sessions });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

interface CreateBody {
  sessionId: string;
  source?: string;
  durationSec?: number;
  totalFrames?: number;
  leakageRisk?: number;
  maskLabel?: string;
  distribution?: Record<string, number>;
  spikes?: unknown[];
  note?: string;
}

/** POST /api/sessions — persist a completed session. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;
    if (!body?.sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }
    const created = await db.session.create({
      data: {
        sessionId: body.sessionId,
        source: body.source ?? "webcam",
        durationSec: body.durationSec ?? 0,
        totalFrames: body.totalFrames ?? 0,
        leakageRisk: body.leakageRisk ?? 0,
        maskLabel: body.maskLabel ?? "Happiness",
        distribution: JSON.stringify(body.distribution ?? {}),
        spikesJson: JSON.stringify(body.spikes ?? []),
        note: body.note,
      },
    });
    return NextResponse.json({ session: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
