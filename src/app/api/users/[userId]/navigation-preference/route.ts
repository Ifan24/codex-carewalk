import { NextResponse } from "next/server";
import { updateUserNavigationPreference } from "@/lib/db/service";
import { NavigationPreferenceSchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const user = await updateUserNavigationPreference({
      userId,
      navigationPreference: NavigationPreferenceSchema.parse(body.navigationPreference),
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Navigation preference update failed." }, { status: 400 });
  }
}
