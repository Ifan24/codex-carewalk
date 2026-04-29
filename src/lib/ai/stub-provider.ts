import { randomUUID } from "crypto";
import {
  ObservationSchema,
  type Observation,
} from "@/lib/schemas";
import { demoEvidencePhotos } from "@/lib/demo/evidence";
import { detectUnsafeContent } from "./safety";
import type { AIProvider, GenerationInput, RawNoteInput } from "./provider";

function evidenceFor(captureMode: RawNoteInput["captureMode"]) {
  return {
    type: captureMode === "rayban_media_upload" ? "rayban_media" : "voice_transcript",
    uri: null,
    summary:
      captureMode === "rayban_media_upload"
        ? "Worker note linked to Worker Glasses media after review."
        : "Worker voice/text transcript.",
    redactionStatus: captureMode === "rayban_media_upload" ? "pending" : "not_required",
  } as const;
}

function ids(observations: Observation[]) {
  return observations.map((observation) => observation.id);
}

function raybanEvidenceSentence(hasReviewedRedactedRaybanMedia: boolean) {
  return hasReviewedRedactedRaybanMedia
    ? " The hallway hazard was also observed in Worker Glasses media after consent, redaction, and worker review."
    : "";
}

const rugPhoto = demoEvidencePhotos.find((photo) => photo.id === "rug_detected_hazard");
const medicinePhoto = demoEvidencePhotos.find((photo) => photo.id === "medicines_supervisor_request");
const dizzinessPhoto = demoEvidencePhotos.find((photo) => photo.id === "lady_dizziness_chat");

export const stubAIProvider: AIProvider = {
  async structureRawNotes(input) {
    const base = {
      visitId: input.visitId,
      capturedBy: input.workerId,
      captureMode: input.captureMode,
      capturedAt: input.capturedAt,
      evidence: evidenceFor(input.captureMode),
    };

    return [
      {
        id: `obs_${randomUUID()}`,
        ...base,
        category: "wellbeing",
        label: "Client appeared settled",
        status: "observed",
        description: "Worker noted Maggie seemed settled during the visit.",
        confidence: "medium",
        isSensitive: false,
        requiresHumanReview: true,
        unknownReason: null,
      },
      {
        id: `obs_${randomUUID()}`,
        ...base,
        category: "nutrition",
        label: "Meals visible in fridge",
        status: "observed",
        description: "Worker observed meals visible in the fridge.",
        confidence: "medium",
        isSensitive: false,
        requiresHumanReview: false,
        unknownReason: null,
      },
      {
        id: `obs_${randomUUID()}`,
        ...base,
        category: "falls_hazard",
        label: "Loose rug near hallway",
        status: "observed",
        description: "Worker observed a loose rug near the hallway walkway.",
        evidence: {
          ...base.evidence,
          uri: rugPhoto?.imageSrc ?? null,
          summary: rugPhoto ? `${rugPhoto.summary} Transcript: Loose rug near hallway.` : base.evidence.summary,
        },
        confidence: "high",
        isSensitive: false,
        requiresHumanReview: true,
        unknownReason: null,
      },
      {
        id: `obs_${randomUUID()}`,
        ...base,
        category: "wellbeing",
        label: "Dizziness reported yesterday",
        status: "observed",
        description: "Client reportedly mentioned dizziness yesterday. Worker noted no current distress during the visit.",
        evidence: {
          ...base.evidence,
          uri: dizzinessPhoto?.imageSrc ?? null,
          summary: dizzinessPhoto ? `${dizzinessPhoto.summary} Transcript: She mentioned dizziness yesterday.` : base.evidence.summary,
        },
        confidence: "medium",
        isSensitive: true,
        requiresHumanReview: true,
        unknownReason: null,
      },
      {
        id: `obs_${randomUUID()}`,
        ...base,
        category: "medication_related_observation",
        label: "Medication use not assessed",
        status: "unknown",
        description: "Medication box was present, but worker did not assess medication use.",
        evidence: {
          ...base.evidence,
          uri: medicinePhoto?.imageSrc ?? null,
          summary: medicinePhoto ? `${medicinePhoto.summary} Transcript: Medication box present but not assessed.` : base.evidence.summary,
          redactionStatus: "not_required",
        },
        confidence: "low",
        isSensitive: true,
        requiresHumanReview: true,
        unknownReason: "Medication use was not assessed and is outside the worker note scope.",
      },
    ].map((observation) => ObservationSchema.parse(observation));
  },

  async generateWorkerNote({ client, observations, hasReviewedRedactedRaybanMedia }: GenerationInput) {
    return {
      type: "worker_note",
      title: "Worker visit note",
      body: `Visit completed with ${client.preferredName}. Worker observed meals visible in the fridge and a loose rug near the hallway walkway. ${client.preferredName} appeared settled during the visit. ${client.preferredName} reportedly mentioned dizziness yesterday; worker noted no current distress during the visit. Medication use was not assessed and remains unknown. Worker recommends supervisor review of the hallway trip hazard.${raybanEvidenceSentence(hasReviewedRedactedRaybanMedia)}`,
      safetyFlags: ["human_signoff_required", "no_diagnosis", "no_medication_advice"],
      evidenceObservationIds: ids(observations),
    };
  },

  async generateProviderLog({ client, visit, observations, escalation, hasReviewedRedactedRaybanMedia }: GenerationInput) {
    const consent = visit.consentEvents.at(-1);
    const redactionLabel = hasReviewedRedactedRaybanMedia ? "applied for Worker Glasses evidence" : "not used in outputs";
    return {
      type: "provider_compliance_log",
      title: "Provider compliance log",
      body: `Visit documentation draft generated for ${client.preferredName}. Consent state: ${consent?.consentState ?? "not recorded"}. Capture modes used: ${visit.captureModesUsed.join(", ") || "none"}. Redaction status: ${redactionLabel}. Structured observations recorded: ${observations.length}. Escalation status: ${escalation.status} ${escalation.riskLevel}. Human sign-off pending.`,
      safetyFlags: [
        consent?.consentState === "granted" ? "consent_recorded" : "consent_required",
        hasReviewedRedactedRaybanMedia ? "redaction_applied" : "manual_evidence_only",
        "human_signoff_required",
        "no_clinical_claims",
      ],
      evidenceObservationIds: ids(observations),
    };
  },

  async generateFamilySummary({ client, observations }: GenerationInput) {
    return {
      type: "family_summary",
      title: "Family update",
      body: `${client.preferredName} received her scheduled visit today and appeared settled during the visit. Meals were visible in the fridge. The worker noticed a loose rug near the hallway, so the provider team will review a follow-up action to help reduce trip hazards. ${client.preferredName} mentioned dizziness yesterday, but the worker noted no current distress during the visit. Medication use was not assessed during this visit.`,
      safetyFlags: ["family_safe", "provider_approval_required", "no_raw_media", "no_diagnosis", "no_medication_advice"],
      evidenceObservationIds: ids(observations),
    };
  },

  async classifySafeMode(text) {
    return detectUnsafeContent(text);
  },
};
