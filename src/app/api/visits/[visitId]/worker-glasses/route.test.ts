import { describe, expect, it } from "vitest";
import { addConsentEvent, resetDemoData } from "@/lib/db/service";
import { GET as getEvents } from "./events/route";
import { POST as startSession } from "./start/route";

function jsonRequest(body: unknown) {
  return new Request("http://carewalk.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Worker Glasses API aliases", () => {
  it("starts a live session through the public Worker Glasses route", async () => {
    await resetDemoData();
    await addConsentEvent({
      visitId: "visit_001",
      clientId: "client_001",
      actorId: "worker_001",
      actorRole: "worker",
      consentState: "granted",
      scope: ["manual_notes", "voice_note", "rayban_media", "family_summary"],
      captureModesAllowed: ["manual_checklist", "voice_transcript", "rayban_media_upload", "rayban_live_assist"],
      notes: "Granted for Worker Glasses.",
    });

    const response = await startSession(jsonRequest({ actorId: "worker_001", actorRole: "worker" }), {
      params: Promise.resolve({ visitId: "visit_001" }),
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.events.at(-1).payload.sessionToken).toMatch(/^worker_glasses_/);
    expect(payload.events.at(-1).payload.frameEndpoint).toBe("/api/visits/visit_001/worker-glasses/frame");

    const events = await getEvents(new Request("http://carewalk.test"), {
      params: Promise.resolve({ visitId: "visit_001" }),
    });
    expect(events.status).toBe(200);
  });
});
