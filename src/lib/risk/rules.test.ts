import { describe, expect, it } from "vitest";
import { maggieClient, maggieVisit } from "@/data/seed";
import type { Observation } from "@/lib/schemas";
import { scoreRisk } from "./rules";

const looseRug: Observation = {
  id: "obs_001",
  visitId: "visit_001",
  category: "falls_hazard",
  label: "Loose rug near hallway",
  status: "observed",
  description: "Worker observed a loose rug near the hallway walkway.",
  evidence: { type: "manual", uri: null, summary: "Manual note.", redactionStatus: "not_required" },
  confidence: "high",
  capturedBy: "worker_001",
  captureMode: "manual_checklist",
  capturedAt: "2026-04-29T10:20:00.000Z",
  isSensitive: false,
  requiresHumanReview: true,
  unknownReason: null,
};

const dizziness: Observation = {
  ...looseRug,
  id: "obs_dizzy",
  category: "wellbeing",
  label: "Dizziness reported during checklist",
  description: "Client reported dizziness this morning but no current severe distress.",
  isSensitive: true,
};

const medicationSupply: Observation = {
  ...looseRug,
  id: "obs_meds",
  category: "medication_related_observation",
  label: "Medication supply concern",
  description: "Worker reported medicines seem too few to last until the next visit.",
  isSensitive: true,
};

describe("risk rules", () => {
  it("creates medium escalation for loose rug plus known falls risk", () => {
    const result = scoreRisk({ client: maggieClient, observations: [looseRug], existingEscalation: maggieVisit.escalation });
    expect(result.riskLevel).toBe("medium");
    expect(result.reason).toContain("loose rug");
  });

  it("routes dizziness to a non-urgent phone follow-up", () => {
    const result = scoreRisk({ client: maggieClient, observations: [dizziness], existingEscalation: maggieVisit.escalation });
    expect(result.riskLevel).toBe("low");
    expect(result.recommendedAction).toContain("phone check-in");
  });

  it("routes medication supply concerns without advice", () => {
    const result = scoreRisk({ client: maggieClient, observations: [medicationSupply], existingEscalation: maggieVisit.escalation });
    expect(result.riskLevel).toBe("medium");
    expect(result.recommendedAction).toContain("Do not provide medication advice");
  });
});
