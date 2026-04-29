import { NextResponse } from "next/server";
import { addLiveRayBanFrame, getLatestLiveRayBanFrame } from "@/lib/db/service";
import { RoleSchema } from "@/lib/schemas";

export async function GET(_: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const frame = getLatestLiveRayBanFrame(visitId);
    return NextResponse.json({ ok: true, frame });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses frame fetch failed." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    const frame = await addLiveRayBanFrame({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      frameId: String(body.frameId ?? ""),
      sessionToken: String(body.sessionToken ?? ""),
      captureContext: String(body.captureContext ?? "hallway"),
      dataUrl: typeof body.dataUrl === "string" ? body.dataUrl : undefined,
      jpegBase64: typeof body.jpegBase64 === "string" ? body.jpegBase64 : undefined,
      sentAt: typeof body.sentAt === "string" ? body.sentAt : undefined,
    });
    return NextResponse.json({ ok: true, frame });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker Glasses frame upload failed." },
      { status: 400 },
    );
  }
}
