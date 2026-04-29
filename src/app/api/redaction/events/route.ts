import { NextResponse } from "next/server";
import { applyRedaction, getVisitBundle } from "@/lib/db/service";
import { RedactionStatusSchema, RoleSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitId = String(body.visitId ?? "");
    await applyRedaction({
      visitId,
      mediaId: String(body.mediaId ?? ""),
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      status: RedactionStatusSchema.parse(body.status ?? "applied"),
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Redaction failed." }, { status: 400 });
  }
}
