import { NextResponse } from "next/server";
import { getVisitBundles } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, visits: await getVisitBundles() });
}
