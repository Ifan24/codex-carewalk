import { NextResponse } from "next/server";
import { addMediaAsset, getVisitBundle } from "@/lib/db/service";
import { CaptureContextSchema, MediaSourceSchema, RoleSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    await addMediaAsset({
      visitId,
      actorId: String(body.actorId ?? "worker_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "worker"),
      source: MediaSourceSchema.parse(body.source ?? "rayban_meta"),
      captureContext: CaptureContextSchema.parse(body.captureContext ?? "hallway"),
      fileName: String(body.fileName ?? "worker-glasses-capture.jpg"),
      mimeType: String(body.mimeType ?? "image/jpeg"),
      previewDataUrl: String(body.previewDataUrl ?? ""),
    });
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Media upload failed." }, { status: 400 });
  }
}
