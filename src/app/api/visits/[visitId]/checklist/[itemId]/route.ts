import { NextResponse } from "next/server";
import { getVisitBundle, updateChecklistItem } from "@/lib/db/service";
import { ChecklistItemStatusSchema, RoleSchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ visitId: string; itemId: string }> }) {
  try {
    const { visitId, itemId } = await params;
    const body = await request.json();
    await updateChecklistItem({
      visitId,
      itemId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      status: ChecklistItemStatusSchema.parse(body.status),
      evidenceTranscript: typeof body.evidenceTranscript === "string" ? body.evidenceTranscript : undefined,
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Checklist update failed." }, { status: 400 });
  }
}
