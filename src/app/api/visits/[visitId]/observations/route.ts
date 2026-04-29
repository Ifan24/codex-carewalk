import { NextResponse } from "next/server";
import { addObservations, getVisitBundle } from "@/lib/db/service";
import { ObservationSchema, RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const observations = (body.observations ?? []).map((observation: unknown) =>
      ObservationSchema.parse({ ...(observation as object), visitId }),
    );
    await addObservations({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      observations,
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Observation save failed." }, { status: 400 });
  }
}
