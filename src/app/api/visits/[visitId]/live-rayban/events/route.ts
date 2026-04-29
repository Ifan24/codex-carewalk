import { NextResponse } from "next/server";
import { addLiveRayBanEvent, addLiveRayBanTranscript, getLiveRayBanEvents } from "@/lib/db/service";
import { LiveRayBanEventTypeSchema, RoleSchema } from "@/lib/schemas";

export async function GET(_: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    return NextResponse.json({ ok: true, events: await getLiveRayBanEvents(visitId) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses events fetch failed." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const actorId = String(body.actorId ?? "worker_001");
    const actorRole = RoleSchema.parse(body.actorRole ?? "worker");
    const eventType = LiveRayBanEventTypeSchema.parse(body.eventType ?? "transcript_chunk");

    if (eventType === "transcript_chunk") {
      const result = await addLiveRayBanTranscript({
        visitId,
        actorId,
        actorRole,
        text: String(body.payload?.text ?? body.text ?? ""),
      });
      return NextResponse.json({ ok: true, ...result, events: await getLiveRayBanEvents(visitId) });
    }

    const event = await addLiveRayBanEvent({
      visitId,
      actorId,
      actorRole,
      eventType,
      payload: typeof body.payload === "object" && body.payload ? (body.payload as Record<string, unknown>) : {},
    });
    return NextResponse.json({ ok: true, event, events: await getLiveRayBanEvents(visitId) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses event save failed." },
      { status: 400 },
    );
  }
}
