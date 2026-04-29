import { NextResponse } from "next/server";
import { getChecklistItems, getVisitBundle, seedVisitChecklist } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    return NextResponse.json({ ok: true, checklistItems: await getChecklistItems(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Checklist load failed." }, { status: 400 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    await seedVisitChecklist(visitId);
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Checklist seed failed." }, { status: 400 });
  }
}
