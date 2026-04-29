import { NextResponse } from "next/server";
import { applyChecklistVoiceCommand, getVisitBundle } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const result = await applyChecklistVoiceCommand({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      transcript: String(body.transcript ?? ""),
      itemId: typeof body.itemId === "string" ? body.itemId : undefined,
    });
    return NextResponse.json({ ok: true, ...result, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Voice checklist failed." }, { status: 400 });
  }
}
