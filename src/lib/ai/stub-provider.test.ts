import { describe, expect, it } from "vitest";
import { maggieClient, maggieVisit } from "@/data/seed";
import { OutputDocumentSchema } from "@/lib/schemas";
import { stubAIProvider } from "./stub-provider";

describe("stub AI provider", () => {
  it("returns validated observations and output documents", async () => {
    const observations = await stubAIProvider.structureRawNotes({
      visitId: "visit_001",
      workerId: "worker_001",
      capturedAt: "2026-04-29T10:30:00.000Z",
      captureMode: "voice_transcript",
      rawNote: "Maggie seemed settled. Loose rug near hallway. Medication box present but not assessed.",
    });
    expect(observations.length).toBeGreaterThan(3);
    expect(observations.some((observation) => observation.status === "unknown")).toBe(true);

    const workerDraft = await stubAIProvider.generateWorkerNote({
      visit: { ...maggieVisit, observations },
      client: maggieClient,
      observations,
      escalation: { ...maggieVisit.escalation, riskLevel: "medium", status: "draft" },
      hasReviewedRedactedRaybanMedia: true,
    });

    const document = OutputDocumentSchema.parse({
      id: "doc_test",
      visitId: "visit_001",
      status: "needs_review",
      generatedAt: "2026-04-29T10:40:00.000Z",
      generatedBy: "ai_stub",
      approvedBy: null,
      approvedAt: null,
      ...workerDraft,
    });
    expect(document.body).toContain("Worker Glasses media");
  });
});
