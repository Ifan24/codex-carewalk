import { NextResponse } from "next/server";
import { getLiveRayBanEvents, startLiveRayBanSession } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    await startLiveRayBanSession({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
    });
    return NextResponse.json({ ok: true, events: await getLiveRayBanEvents(visitId) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses start failed." },
      { status: 400 },
    );
  }
}
