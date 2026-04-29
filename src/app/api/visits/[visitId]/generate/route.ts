import { NextResponse } from "next/server";
import { generateVisitPack, getVisitBundle } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    await generateVisitPack({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Generation failed." }, { status: 400 });
  }
}
