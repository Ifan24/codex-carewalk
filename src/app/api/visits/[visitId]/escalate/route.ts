import { NextResponse } from "next/server";
import { getVisitBundle, refreshEscalation } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    await refreshEscalation(visitId, String(body.actorId ?? "worker_001"), RoleSchema.parse(body.actorRole ?? "worker"));
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Escalation failed." }, { status: 400 });
  }
}
