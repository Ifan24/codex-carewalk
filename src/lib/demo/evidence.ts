import type { FollowUpTask, Observation, VisitChecklistItem } from "@/lib/schemas";

export type DemoEvidencePhoto = {
  id: "rug_detected_hazard" | "medicines_supervisor_request" | "lady_dizziness_chat";
  title: string;
  badge: string;
  imageSrc: string;
  imageAlt: string;
  transcript: string;
  summary: string;
  checklistCategory: VisitChecklistItem["category"];
  observationMatch: RegExp;
  followUpActionType: FollowUpTask["actionType"];
};

export const demoEvidencePhotos = [
  {
    id: "rug_detected_hazard",
    title: "Rug hazard detected",
    badge: "Detected hazard",
    imageSrc: "/evidence/rug-detected-hazard.png",
    imageAlt: "Worker Glasses view of a curled rug edge in the walking path near the couch.",
    transcript: "Worker Glasses detected the rug edge curling into Maggie's walking path near the couch.",
    summary: "Curled rug edge visible in the living room walking path.",
    checklistCategory: "falls_hazard",
    observationMatch: /rug|mat|curled|loose|trip|walking path|walkway/i,
    followUpActionType: "home_hazard",
  },
  {
    id: "medicines_supervisor_request",
    title: "Medication supply follow-up",
    badge: "Supervisor request",
    imageSrc: "/evidence/medicines-supervisor-request.png",
    imageAlt: "Worker Glasses view of a weekly medicine organizer held for a supply check.",
    transcript: "Worker noted the medicines may be too few to last until the next visit and routed it for supervisor follow-up.",
    summary: "Medicine organizer visible; supply concern captured for authorised follow-up only.",
    checklistCategory: "medication_supply",
    observationMatch: /medicine|medication|tablet|supply|few|low|run out|not enough|not assessed/i,
    followUpActionType: "medication_supply_followup",
  },
  {
    id: "lady_dizziness_chat",
    title: "Dizziness chat",
    badge: "Client chat",
    imageSrc: "/evidence/lady-dizziness-chat.png",
    imageAlt: "Worker Glasses view of Maggie seated in her living room during a wellbeing chat.",
    transcript: "Maggie said she felt dizzy this morning but is settled now; record for a non-urgent check-in.",
    summary: "Wellbeing chat captured with reported dizziness and no current distress.",
    checklistCategory: "wellbeing",
    observationMatch: /dizz|light.?headed|unsteady|settled|wellbeing/i,
    followUpActionType: "phone_call",
  },
] as const satisfies DemoEvidencePhoto[];

export function demoEvidenceForChecklistCategory(category: VisitChecklistItem["category"]) {
  return demoEvidencePhotos.find((photo) => photo.checklistCategory === category) ?? null;
}

export function demoEvidenceForObservation(observation: Pick<Observation, "category" | "label" | "description" | "evidence">) {
  const text = `${observation.category} ${observation.label} ${observation.description} ${observation.evidence.summary}`;
  return demoEvidencePhotos.find((photo) => photo.observationMatch.test(text)) ?? null;
}

export function demoEvidenceForFollowUpTask(task: Pick<FollowUpTask, "actionType" | "title" | "recommendationReason">) {
  return (
    demoEvidencePhotos.find((photo) => photo.followUpActionType === task.actionType) ??
    demoEvidencePhotos.find((photo) => photo.observationMatch.test(`${task.title} ${task.recommendationReason}`)) ??
    null
  );
}
