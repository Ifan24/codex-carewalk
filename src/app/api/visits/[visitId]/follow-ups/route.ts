import { NextResponse } from "next/server";
import { createFollowUpTask, createRecommendedFollowUps, getVisitBundle } from "@/lib/db/service";
import { FollowUpActionTypeSchema, FollowUpTaskPrioritySchema, FollowUpTaskStatusSchema, RoleSchema } from "@/lib/schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) return NextResponse.json({ ok: false, error: "Visit not found." }, { status: 404 });
  return NextResponse.json({ ok: true, followUpTasks: bundle.followUpTasks });
}

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  try {
    const { visitId } = await params;
    const body = await request.json();
    if (body.recommended === true) {
      await createRecommendedFollowUps({
        visitId,
        actorId: String(body.actorId ?? "supervisor_001"),
        actorRole: RoleSchema.parse(body.actorRole ?? "supervisor"),
      });
    } else {
      await createFollowUpTask({
        visitId,
        actorId: String(body.actorId ?? "supervisor_001"),
        actorRole: RoleSchema.parse(body.actorRole ?? "supervisor"),
        actionType: FollowUpActionTypeSchema.parse(body.actionType ?? "phone_call"),
        priority: FollowUpTaskPrioritySchema.parse(body.priority ?? "medium"),
        status: FollowUpTaskStatusSchema.parse(body.status ?? "accepted"),
        title: String(body.title ?? "Supervisor follow-up"),
        recommendationReason: String(body.recommendationReason ?? "Created by supervisor."),
        sourceObservationIds: Array.isArray(body.sourceObservationIds) ? body.sourceObservationIds.map(String) : [],
        assignedTo: typeof body.assignedTo === "string" ? body.assignedTo : "supervisor_001",
        dueAt: typeof body.dueAt === "string" ? body.dueAt : null,
      });
    }
    return NextResponse.json({ ok: true, bundle: await getVisitBundle(visitId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Follow-up create failed." }, { status: 400 });
  }
}
