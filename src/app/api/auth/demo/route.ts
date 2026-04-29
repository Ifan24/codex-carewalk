import { NextResponse } from "next/server";
import { demoLogin } from "@/lib/db/service";

export async function POST(request: Request) {
  const body = await request.json();
  const user = await demoLogin(String(body.email ?? ""), String(body.password ?? ""));
  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid login." }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
  });
}
