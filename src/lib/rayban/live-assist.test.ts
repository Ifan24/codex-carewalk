import { describe, expect, it } from "vitest";
import { maggieClient } from "@/data/seed";
import { answerLiveServiceQuestion, detectLiveHazards, observationsFromLiveRayBanEvents } from "./live-assist";
import type { LiveRayBanEvent } from "@/lib/schemas";

describe("Worker Glasses live assist helpers", () => {
  it("detects hallway trip hazards from transcript text", () => {
    const hazards = detectLiveHazards("I can see a loose rug near the hallway walkway.");
    expect(hazards).toHaveLength(1);
    expect(hazards[0].label).toMatch(/rug/i);
    expect(hazards[0].context).toBe("hallway");
  });

  it("answers booking questions without committing provider availability", () => {
    const response = answerLiveServiceQuestion("How do I book the next session on Friday with your NDIS service?", maggieClient);
    expect(response.answer).toContain("Friday");
    expect(response.answer).toMatch(/confirm/i);
    expect(response.safetyFlags).toContain("provider_confirmation_required");
  });

  it("summarises live events into reviewable observations saved on session end", () => {
    const events: LiveRayBanEvent[] = [
      {
        id: "live_1",
        visitId: "visit_001",
        actorId: "worker_001",
        actorRole: "worker",
        eventType: "transcript_chunk",
        payload: { text: "Maggie asked about booking Friday." },
        createdAt: "2026-04-29T10:00:00.000Z",
      },
      {
        id: "live_2",
        visitId: "visit_001",
        actorId: "worker_001",
        actorRole: "worker",
        eventType: "hazard_candidate",
        payload: {
          label: "Loose rug in walkway",
          summary: "Loose rug near hallway.",
          context: "hallway",
          severity: "review",
          observedAt: "2026-04-29T10:01:00.000Z",
        },
        createdAt: "2026-04-29T10:01:00.000Z",
      },
    ];

    const observations = observationsFromLiveRayBanEvents({
      visitId: "visit_001",
      actorId: "worker_001",
      events,
      endedAt: "2026-04-29T10:05:00.000Z",
    });

    expect(observations.map((observation) => observation.label)).toContain("Worker Glasses hazard summary");
    expect(observations.find((observation) => observation.label === "Worker Glasses hazard summary")?.captureMode).toBe(
      "rayban_live_assist",
    );
  });
});
