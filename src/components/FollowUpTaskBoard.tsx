"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Save, ThumbsUp, XCircle } from "lucide-react";
import type { FollowUpTask } from "@/lib/schemas";
import { demoEvidenceForFollowUpTask } from "@/lib/demo/evidence";
import { InlineEvidencePhoto } from "./EvidencePhotos";
import { Badge } from "./ui";

function toneForPriority(priority: FollowUpTask["priority"]) {
  if (priority === "urgent" || priority === "high") return "red" as const;
  if (priority === "medium") return "amber" as const;
  return "neutral" as const;
}

export function FollowUpTaskBoard({ tasks }: { tasks: FollowUpTask[] }) {
  if (!tasks.length) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
        No supervisor follow-up tasks yet. Submitted visits will populate recommendations here.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <FollowUpTaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

function FollowUpTaskCard({ task }: { task: FollowUpTask }) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo ?? "supervisor_001");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const photo = demoEvidenceForFollowUpTask(task);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/follow-ups/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "supervisor_001", actorRole: "supervisor", ...body }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    setMessage("Task updated.");
    router.refresh();
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone={toneForPriority(task.priority)}>{task.priority}</Badge>
          <Badge tone={task.status === "completed" ? "green" : task.status === "dismissed" ? "neutral" : "blue"}>
            {task.status}
          </Badge>
          <Badge>{task.actionType.replaceAll("_", " ")}</Badge>
        </div>
        {task.dueAt ? <span className="text-xs font-semibold text-stone-500">Due {new Date(task.dueAt).toLocaleDateString()}</span> : null}
      </div>
      <label className="block">
        <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-900">
          <ClipboardList className="h-4 w-4" /> Task
        </span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm font-semibold"
        />
      </label>
      <p className="mt-2 text-sm leading-6 text-stone-600">{task.recommendationReason}</p>
      {photo ? <InlineEvidencePhoto photo={photo} /> : null}
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-stone-900">Assignee</span>
        <input
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          className="min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ status: "accepted", assignedTo })}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-800 disabled:opacity-50"
        >
          <ThumbsUp className="h-4 w-4" />
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ title, assignedTo, status: "assigned" })}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save assign
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ status: "completed" })}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Complete
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ status: "dismissed" })}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Dismiss
        </button>
      </div>
      {message ? <p className="mt-2 text-sm font-semibold text-stone-800">{message}</p> : null}
    </article>
  );
}
