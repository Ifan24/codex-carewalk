import { NextResponse } from "next/server";
import { getClients } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, clients: await getClients() });
}
