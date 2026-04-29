import type { AuditEvent } from "@/lib/schemas";

function eventTitle(type: AuditEvent["eventType"]) {
  return type.replace("DEMO_RESET", "RESET").replaceAll("LIVE_RAYBAN", "WORKER_GLASSES").replaceAll("_", " ");
}

function eventSummary(summary: string) {
  return summary
    .replaceAll("rayban_media", "Worker Glasses")
    .replaceAll("rayban_live_assist", "Worker Glasses live")
    .replaceAll("rayban_media_upload", "Worker Glasses media");
}

export function AuditTrail({ events }: { events: AuditEvent[] }) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-950">{eventTitle(event.eventType)}</p>
            <time className="font-mono text-xs text-stone-500">{new Date(event.createdAt).toLocaleString()}</time>
          </div>
          <p className="mt-1 text-sm text-stone-600">{eventSummary(event.summary)}</p>
          <p className="mt-2 text-xs font-semibold text-teal-700">{event.actorRole}</p>
        </div>
      ))}
    </div>
  );
}
