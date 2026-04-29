import { NextResponse } from "next/server";
import { generateReviewChecklist } from "@/lib/ai/review-checklist";
import { getVisitBundle } from "@/lib/db/service";

export async function POST(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) return NextResponse.json({ ok: false, error: "Visit not found." }, { status: 404 });

  const checklist = await generateReviewChecklist(bundle);
  return NextResponse.json({ ok: true, checklist });
}
