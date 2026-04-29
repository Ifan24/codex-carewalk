import { NextResponse } from "next/server";
import { getVisitBundle } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) return NextResponse.json({ ok: false, error: "Visit not found." }, { status: 404 });
  return NextResponse.json({ ok: true, bundle });
}
