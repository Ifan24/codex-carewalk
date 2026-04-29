import { NextResponse } from "next/server";
import { addConsentEvent, getVisitBundle } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const bundle = await getVisitBundle(visitId);
    if (!bundle) return NextResponse.json({ ok: false, error: "Visit not found." }, { status: 404 });
    await addConsentEvent({
      visitId,
      clientId: bundle.client.id,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      consentState: body.consentState,
      scope: body.scope ?? [],
      captureModesAllowed: body.captureModesAllowed ?? [],
      notes: String(body.notes ?? ""),
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Consent failed." }, { status: 400 });
  }
}
