import { NextResponse } from "next/server";
import { getVisitBundle, signOffOutput, undoOutputSignOff } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const input = {
      visitId,
      outputId: String(body.outputId ?? ""),
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
    };
    if (body.action === "undo") {
      await undoOutputSignOff(input);
    } else {
      await signOffOutput(input);
    }
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sign-off failed." }, { status: 400 });
  }
}
