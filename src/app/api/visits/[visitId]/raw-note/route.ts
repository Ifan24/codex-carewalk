import { NextResponse } from "next/server";
import { getVisitBundle, structureRawNote } from "@/lib/db/service";
import { CaptureModeSchema, RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    await structureRawNote({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      rawNote: String(body.rawNote ?? ""),
      captureMode: CaptureModeSchema.parse(body.captureMode ?? "voice_transcript"),
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Raw note conversion failed." }, { status: 400 });
  }
}
