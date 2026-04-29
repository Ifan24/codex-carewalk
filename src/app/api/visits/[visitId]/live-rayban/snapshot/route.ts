import { NextResponse } from "next/server";
import { getVisitBundle, saveLiveRayBanSnapshot } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const media = await saveLiveRayBanSnapshot({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      sessionToken: String(body.sessionToken ?? ""),
      frameId: typeof body.frameId === "string" ? body.frameId : undefined,
      captureContext: typeof body.captureContext === "string" ? body.captureContext : undefined,
    });
    return NextResponse.json({ ok: true, media, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses snapshot failed." },
      { status: 400 },
    );
  }
}
