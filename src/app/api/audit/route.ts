import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { mapAudit } from "@/lib/db/mappers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get("visitId");
  const rows = await getPrisma().auditEvent.findMany({
    where: visitId ? { visitId } : {},
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ ok: true, auditEvents: rows.map(mapAudit) });
}
