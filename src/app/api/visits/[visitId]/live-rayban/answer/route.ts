import { NextResponse } from "next/server";
import { answerLiveRayBanQuestion, getLiveRayBanEvents } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const result = await answerLiveRayBanQuestion({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      question: String(body.question ?? ""),
    });
    return NextResponse.json({ ok: true, ...result, events: await getLiveRayBanEvents(visitId) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses answer failed." },
      { status: 400 },
    );
  }
}
