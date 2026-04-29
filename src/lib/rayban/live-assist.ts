import { randomUUID } from "crypto";
import {
  CaptureContextSchema,
  ObservationSchema,
  isPrivateCaptureContext,
  type CaptureMode,
  type ClientProfile,
  type LiveRayBanEvent,
  type Observation,
} from "@/lib/schemas";

export type LiveHazardSeverity = "watch" | "review" | "urgent";

export type LiveHazardCandidate = {
  label: string;
  summary: string;
  context: string;
  severity: LiveHazardSeverity;
  observedAt: string;
};

export type LiveServiceAnswer = {
  answer: string;
  safetyFlags: string[];
};

const hazardMatchers: Array<{ pattern: RegExp; label: string; summary: string; severity: LiveHazardSeverity }> = [
  {
    pattern: /\b(rug|mat).*\b(loose|lifted|curled|trip)|\b(loose|lifted|curled).*\b(rug|mat)\b/i,
    label: "Loose rug in walkway",
    summary: "Possible trip hazard from a loose or lifted rug near the walking path.",
    severity: "review",
  },
  {
    pattern: /\b(cord|cable|lead).*\b(walkway|floor|path|across)|\b(across).*\b(cord|cable|lead)\b/i,
    label: "Cord across walkway",
    summary: "Possible trip hazard from a cord or cable crossing the walking path.",
    severity: "review",
  },
  {
    pattern: /\b(wet|spill|water).*\b(floor|tiles|walkway)|\b(floor|tiles|walkway).*\b(wet|spill|water)\b/i,
    label: "Wet floor area",
    summary: "Possible slip hazard from moisture or a spill on the floor.",
    severity: "review",
  },
  {
    pattern: /\b(clutter|boxes|bags|shoes).*\b(walkway|hall|entry|path)\b/i,
    label: "Clutter in walking path",
    summary: "Possible access or trip hazard from clutter in a walking path.",
    severity: "watch",
  },
  {
    pattern: /\b(dim|dark|low light|poor lighting)\b/i,
    label: "Low lighting",
    summary: "Possible visibility hazard from low lighting in a movement area.",
    severity: "watch",
  },
];

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export function detectLiveHazards(text: string, observedAt = new Date().toISOString()): LiveHazardCandidate[] {
  const normalised = text.trim();
  if (!normalised) return [];

  const hazards = new Map<string, LiveHazardCandidate>();
  for (const matcher of hazardMatchers) {
    if (!matcher.pattern.test(normalised)) continue;
    hazards.set(matcher.label, {
      label: matcher.label,
      summary: matcher.summary,
      context: normalised.match(/\b(entry|entryway)\b/i) ? "entryway" : "hallway",
      severity: matcher.severity,
      observedAt,
    });
  }

  return [...hazards.values()];
}

export function answerLiveServiceQuestion(question: string, client: ClientProfile): LiveServiceAnswer {
  const lowerQuestion = question.toLowerCase();
  if (/\b(book|schedule|next session|appointment|visit)\b/.test(lowerQuestion)) {
    const day = lowerQuestion.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)?.[1];
    const dayText = day ? ` for ${day[0].toUpperCase()}${day.slice(1)}` : "";
    return {
      answer: `I can note that request${dayText} and ask the provider team to confirm the next NDIS service booking. The office still needs to check worker availability, your service agreement, and funding details before it is locked in.`,
      safetyFlags: ["provider_confirmation_required", "no_funding_commitment", "service_booking_support"],
    };
  }

  if (/\b(medicine|medication|dose|tablet|pain|dizzy|dizziness|doctor|diagnos)/.test(lowerQuestion)) {
    return {
      answer: `I cannot give medical or medication advice. I can write down your question for the provider team, and if you feel unsafe or very unwell we should contact the agreed support pathway now.`,
      safetyFlags: ["no_medical_advice", "human_follow_up_required"],
    };
  }

  return {
    answer: `I can write that down for ${client.preferredName}'s provider team to review. I should avoid promising an outcome during the visit, but I can capture the request and ask the office to follow up.`,
    safetyFlags: ["human_follow_up_required", "no_autonomous_commitment"],
  };
}

function payloadString(event: LiveRayBanEvent, key: string) {
  const value = event.payload[key];
  return typeof value === "string" ? value : "";
}

function payloadSeverity(event: LiveRayBanEvent): LiveHazardSeverity {
  const value = event.payload.severity;
  return value === "urgent" || value === "review" || value === "watch" ? value : "watch";
}

function eventTime(event: LiveRayBanEvent) {
  return payloadString(event, "observedAt") || payloadString(event, "answeredAt") || event.createdAt;
}

function makeObservation(input: {
  visitId: string;
  actorId: string;
  captureMode: CaptureMode;
  category: Observation["category"];
  label: string;
  description: string;
  evidenceType: Observation["evidence"]["type"];
  evidenceSummary: string;
  capturedAt: string;
  confidence: Observation["confidence"];
  isSensitive: boolean;
}) {
  return ObservationSchema.parse({
    id: `obs_${randomUUID()}`,
    visitId: input.visitId,
    category: input.category,
    label: input.label,
    status: "observed",
    description: input.description,
    evidence: {
      type: input.evidenceType,
      uri: null,
      summary: input.evidenceSummary,
      redactionStatus: "not_required",
    },
    confidence: input.confidence,
    capturedBy: input.actorId,
    captureMode: input.captureMode,
    capturedAt: input.capturedAt,
    isSensitive: input.isSensitive,
    requiresHumanReview: true,
    unknownReason: null,
  });
}

export function observationsFromLiveRayBanEvents(input: {
  visitId: string;
  actorId: string;
  events: LiveRayBanEvent[];
  endedAt: string;
}): Observation[] {
  const transcript = input.events
    .filter((event) => event.eventType === "transcript_chunk")
    .map((event) => payloadString(event, "text").trim())
    .filter(Boolean)
    .join(" ");

  const hazards = input.events
    .filter((event) => event.eventType === "hazard_candidate")
    .map((event): LiveHazardCandidate => {
      const parsedContext = CaptureContextSchema.safeParse(payloadString(event, "context"));
      return {
        label: payloadString(event, "label") || "Live hazard candidate",
        summary: payloadString(event, "summary") || "Potential home environment hazard observed during Worker Glasses session.",
        context: parsedContext.success && !isPrivateCaptureContext(parsedContext.data) ? parsedContext.data : "other",
        severity: payloadSeverity(event),
        observedAt: eventTime(event),
      };
    });

  const questions = input.events
    .filter((event) => event.eventType === "question_answer")
    .map((event) => ({
      question: payloadString(event, "question"),
      answer: payloadString(event, "answer"),
      answeredAt: eventTime(event),
    }))
    .filter((item) => item.question && item.answer);

  const checklistResponses = input.events
    .filter((event) => event.eventType === "checklist_response")
    .map((event) => ({
      prompt: payloadString(event, "prompt"),
      status: payloadString(event, "status"),
      evidenceTranscript: payloadString(event, "evidenceTranscript"),
      capturedAt: eventTime(event),
    }))
    .filter((item) => item.prompt || item.evidenceTranscript);

  const observations: Observation[] = [];

  if (transcript) {
    observations.push(
      makeObservation({
        visitId: input.visitId,
        actorId: input.actorId,
        captureMode: "voice_transcript",
        category: "service_delivery",
        label: "Live visit transcript captured",
        description: truncate(`Worker Glasses transcript: ${transcript}`, 700),
        evidenceType: "voice_transcript",
        evidenceSummary: "Transcript chunk received from consented Worker Glasses session.",
        capturedAt: input.endedAt,
        confidence: "medium",
        isSensitive: true,
      }),
    );
  }

  if (hazards.length) {
    const description = hazards
      .map((hazard) => `${hazard.label} (${hazard.context}, ${hazard.severity}): ${hazard.summary}`)
      .join(" ");
    observations.push(
      makeObservation({
        visitId: input.visitId,
        actorId: input.actorId,
        captureMode: "rayban_live_assist",
        category: hazards.some((hazard) => /rug|cord|cable|slip|trip|floor|walk/i.test(`${hazard.label} ${hazard.summary}`))
          ? "falls_hazard"
          : "home_environment",
        label: "Worker Glasses hazard summary",
        description: truncate(`Saved when the worker ended the live session. ${description}`, 900),
        evidenceType: "rayban_live_summary",
        evidenceSummary: "Hazard candidates summarised from a consented Worker Glasses session. No raw live video was stored.",
        capturedAt: input.endedAt,
        confidence: hazards.some((hazard) => hazard.severity === "review" || hazard.severity === "urgent") ? "medium" : "low",
        isSensitive: false,
      }),
    );
  }

  if (questions.length) {
    const description = questions
      .map((item) => `Question: ${item.question} Answer given: ${item.answer}`)
      .join(" ");
    observations.push(
      makeObservation({
        visitId: input.visitId,
        actorId: input.actorId,
        captureMode: "rayban_live_assist",
        category: "service_delivery",
        label: "Live service question answered",
        description: truncate(description, 900),
        evidenceType: "voice_transcript",
        evidenceSummary: "Service question and response captured during the Worker Glasses session.",
        capturedAt: questions.at(-1)?.answeredAt ?? input.endedAt,
        confidence: "medium",
        isSensitive: true,
      }),
    );
  }

  if (checklistResponses.length) {
    const description = checklistResponses
      .map((item) => `${item.status || "captured"}: ${item.prompt} ${item.evidenceTranscript}`.trim())
      .join(" ");
    observations.push(
      makeObservation({
        visitId: input.visitId,
        actorId: input.actorId,
        captureMode: "rayban_live_assist",
        category: "service_delivery",
        label: "Live checklist responses captured",
        description: truncate(description, 900),
        evidenceType: "voice_transcript",
        evidenceSummary: "Checklist prompt responses captured during the consented Worker Glasses session.",
        capturedAt: checklistResponses.at(-1)?.capturedAt ?? input.endedAt,
        confidence: "medium",
        isSensitive: true,
      }),
    );
  }

  return observations;
}
