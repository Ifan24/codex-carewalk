import { NextResponse } from "next/server";
import { updateFollowUpTask } from "@/lib/db/service";
import { FollowUpTaskPrioritySchema, FollowUpTaskStatusSchema, RoleSchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const task = await updateFollowUpTask({
      taskId,
      actorId: String(body.actorId ?? "supervisor_001"),
      actorRole: RoleSchema.parse(body.actorRole ?? "supervisor"),
      status: body.status ? FollowUpTaskStatusSchema.parse(body.status) : undefined,
      priority: body.priority ? FollowUpTaskPrioritySchema.parse(body.priority) : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      recommendationReason: typeof body.recommendationReason === "string" ? body.recommendationReason : undefined,
      assignedTo: body.assignedTo === undefined ? undefined : body.assignedTo === null ? null : String(body.assignedTo),
      dueAt: body.dueAt === undefined ? undefined : body.dueAt === null ? null : String(body.dueAt),
    });
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Follow-up update failed." }, { status: 400 });
  }
}
