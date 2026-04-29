import { describe, expect, it } from "vitest";
import {
  ClientProfileSchema,
  FollowUpTaskSchema,
  MediaAssetSchema,
  ObservationSchema,
  VisitChecklistItemSchema,
  VisitSessionSchema,
  isPrivateCaptureContext,
} from ".";
import { maggieClient, maggieVisit } from "@/data/seed";

describe("CareWalk schemas", () => {
  it("validates seeded client and visit objects", () => {
    expect(ClientProfileSchema.parse(maggieClient).preferredName).toBe("Maggie");
    expect(VisitSessionSchema.parse(maggieVisit).id).toBe("visit_001");
  });

  it("rejects unknown fields", () => {
    expect(() => ClientProfileSchema.parse({ ...maggieClient, unexpected: true })).toThrow();
  });

  it("rejects missing required fields", () => {
    const { displayName, ...withoutDisplayName } = maggieClient;
    expect(displayName).toBe("Margaret Liu");
    expect(() => ClientProfileSchema.parse(withoutDisplayName)).toThrow();
  });

  it("accepts explicit unknown medication observation", () => {
    const observation = ObservationSchema.parse({
      id: "obs_test",
      visitId: "visit_001",
      category: "medication_related_observation",
      label: "Medication use not assessed",
      status: "unknown",
      description: "Medication box was present, but use was not assessed.",
      evidence: {
        type: "manual",
        uri: null,
        summary: "Worker marked field as unknown.",
        redactionStatus: "not_required",
      },
      confidence: "low",
      capturedBy: "worker_001",
      captureMode: "manual_checklist",
      capturedAt: "2026-04-29T10:25:00.000Z",
      isSensitive: true,
      requiresHumanReview: true,
      unknownReason: "Outside worker scope.",
    });
    expect(observation.status).toBe("unknown");
    expect(observation.unknownReason).toContain("scope");
  });

  it("models Worker Glasses and legacy media sources", () => {
    expect(
      MediaAssetSchema.parse({
        id: "media_001",
        visitId: "visit_001",
        source: "rayban_meta",
        captureContext: "hallway",
        consentEventId: "consent_001",
        redactionStatus: "pending",
        fileName: "rayban.jpg",
        mimeType: "image/jpeg",
        previewDataUrl: "data:image/jpeg;base64,abc",
        linkedObservationIds: [],
        workerReviewed: false,
        createdAt: "2026-04-29T10:21:00.000Z",
        updatedAt: "2026-04-29T10:21:00.000Z",
      }).source,
    ).toBe("rayban_meta");
    expect(isPrivateCaptureContext("bedroom")).toBe(true);
  });

  it("models persisted checklist and follow-up tasks", () => {
    expect(
      VisitChecklistItemSchema.parse({
        id: "check_001",
        visitId: "visit_001",
        sequence: 1,
        prompt: "Check meds supply.",
        category: "medication_supply",
        status: "active",
        evidenceTranscript: null,
        linkedObservationId: null,
        createdAt: "2026-04-29T10:00:00.000Z",
        updatedAt: "2026-04-29T10:00:00.000Z",
        completedAt: null,
      }).category,
    ).toBe("medication_supply");

    expect(
      FollowUpTaskSchema.parse({
        id: "follow_001",
        visitId: "visit_001",
        escalationId: "esc_001",
        actionType: "phone_call",
        priority: "medium",
        status: "recommended",
        title: "Phone check-in tomorrow",
        recommendationReason: "Client reported dizziness.",
        sourceObservationIds: ["obs_001"],
        assignedTo: "supervisor_001",
        dueAt: "2026-04-30T10:00:00.000Z",
        createdAt: "2026-04-29T10:00:00.000Z",
        updatedAt: "2026-04-29T10:00:00.000Z",
      }).actionType,
    ).toBe("phone_call");
  });
});
