import { NextResponse } from "next/server";

import { db } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/sessions/:id — fetch a single session with its spikes. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await db.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      session: {
        ...session,
        distribution: JSON.parse(session.distribution || "{}"),
        spikes: JSON.parse(session.spikesJson || "[]"),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

/** DELETE /api/sessions/:id — remove a session. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await db.session.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
