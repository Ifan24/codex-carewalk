import { describe, expect, it } from "vitest";
import { addConsentEvent, resetDemoData } from "@/lib/db/service";
import { GET as getChecklist } from "./route";
import { POST as postVoice } from "./voice/route";
import { POST as submitVisit } from "../submit/route";

function jsonRequest(body: unknown) {
  return new Request("http://carewalk.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("visit checklist API routes", () => {
  it("loads seeded checklist items", async () => {
    await resetDemoData();
    const response = await getChecklist(new Request("http://carewalk.test"), {
      params: Promise.resolve({ visitId: "visit_001" }),
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.checklistItems).toHaveLength(6);
  });

  it("requires voice consent for voice checklist commands", async () => {
    await resetDemoData();
    const blocked = await postVoice(jsonRequest({ transcript: "done" }), {
      params: Promise.resolve({ visitId: "visit_001" }),
    });
    expect(blocked.status).toBe(400);

    await addConsentEvent({
      visitId: "visit_001",
      clientId: "client_001",
      actorId: "worker_001",
      actorRole: "worker",
      consentState: "granted",
      scope: ["manual_notes", "voice_note", "family_summary"],
      captureModesAllowed: ["manual_checklist", "voice_transcript"],
      notes: "Granted for voice checklist.",
    });
    const allowed = await postVoice(jsonRequest({ transcript: "done wellbeing checked" }), {
      params: Promise.resolve({ visitId: "visit_001" }),
    });
    const payload = await allowed.json();
    expect(allowed.status).toBe(200);
    expect(payload.status).toBe("done");
  });

  it("allows demo report submission before prerequisites are complete", async () => {
    await resetDemoData();
    const response = await submitVisit(jsonRequest({ actorId: "worker_001", actorRole: "worker" }), {
      params: Promise.resolve({ visitId: "visit_001" }),
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.bundle.visit.status).toBe("submitted");
  });
});
