import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/db/prisma";
import {
  mapAudit,
  mapClient,
  mapConsent,
  mapFollowUpTask,
  mapLiveRayBanEvent,
  mapMedia,
  mapOutput,
  mapVisitChecklistItem,
  mapVisitBundle,
} from "@/lib/db/mappers";
import { stubAIProvider } from "@/lib/ai/stub-provider";
import { detectUnsafeContent } from "@/lib/ai/safety";
import { getLiveRayBanFrameBuffer } from "@/lib/rayban/frame-buffer";
import { answerLiveServiceQuestion, detectLiveHazards, observationsFromLiveRayBanEvents } from "@/lib/rayban/live-assist";
import { scoreRisk } from "@/lib/risk/rules";
import { demoEvidenceForChecklistCategory } from "@/lib/demo/evidence";
import {
  CaptureContextSchema,
  ChecklistItemStatusSchema,
  ConsentEventSchema,
  FollowUpActionTypeSchema,
  FollowUpTaskPrioritySchema,
  FollowUpTaskStatusSchema,
  LiveRayBanFrameSchema,
  LiveRayBanEventSchema,
  LiveRayBanEventTypeSchema,
  MediaAssetSchema,
  NavigationPreferenceSchema,
  ObservationSchema,
  OutputDocumentSchema,
  RedactionEventSchema,
  isPrivateCaptureContext,
  type AuditEvent,
  type CaptureMode,
  type ConsentEvent,
  type FollowUpActionType,
  type FollowUpTask,
  type FollowUpTaskPriority,
  type FollowUpTaskStatus,
  type LiveRayBanEventType,
  type MediaAsset,
  type NavigationPreference,
  type Observation,
  type OutputDocument,
  type RedactionEvent,
  type Role,
  type VisitChecklistItem,
} from "@/lib/schemas";
import { demoUsers, maggieClient, maggieVisit, initialAuditEvents } from "@/data/seed";

function json(value: unknown) {
  return JSON.stringify(value);
}

function now() {
  return new Date();
}

const consentScopeLabels: Record<string, string> = {
  manual_notes: "manual notes",
  voice_note: "voice note",
  rayban_media: "Worker Glasses",
  phone_photo: "visit photo",
  family_summary: "family summary",
};

function formatConsentScopes(scopes: string[]) {
  return scopes.map((scope) => consentScopeLabels[scope] ?? scope.replaceAll("_", " ")).join(", ") || "none";
}

const visitInclude = {
  observations: { orderBy: { capturedAt: "asc" as const } },
  consentEvents: { orderBy: { recordedAt: "asc" as const } },
  checklistItems: { orderBy: { sequence: "asc" as const } },
  mediaAssets: { orderBy: { createdAt: "asc" as const } },
  redactionEvents: { orderBy: { processedAt: "asc" as const } },
  escalation: true,
  outputs: { orderBy: { generatedAt: "asc" as const } },
};

export async function addAuditEvent(input: {
  actorId: string;
  actorRole: Role;
  visitId?: string | null;
  clientId?: string | null;
  eventType: AuditEvent["eventType"];
  summary: string;
  safetyFlags?: string[];
}) {
  const prisma = getPrisma();
  return mapAudit(
    await prisma.auditEvent.create({
      data: {
        id: `audit_${randomUUID()}`,
        actorId: input.actorId,
        actorRole: input.actorRole,
        visitId: input.visitId ?? null,
        clientId: input.clientId ?? null,
        eventType: input.eventType,
        summary: input.summary,
        safetyFlagsJson: json(input.safetyFlags ?? []),
      },
    }),
  );
}

export async function getUsers() {
  const prisma = getPrisma();
  return prisma.user.findMany({ orderBy: { email: "asc" } });
}

export async function updateUserNavigationPreference(input: {
  userId: string;
  navigationPreference: NavigationPreference;
}) {
  const prisma = getPrisma();
  return prisma.user.update({
    where: { id: input.userId },
    data: { navigationPreference: NavigationPreferenceSchema.parse(input.navigationPreference) },
  });
}

export async function demoLogin(email: string, password: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== password) return null;
  await addAuditEvent({
    actorId: user.id,
    actorRole: user.role as Role,
    eventType: "LOGIN",
    summary: `${user.displayName} logged in as ${user.role}.`,
    safetyFlags: ["demo_auth"],
  });
  return user;
}

export async function getClients() {
  const prisma = getPrisma();
  const clients = await prisma.clientProfile.findMany({ orderBy: { displayName: "asc" } });
  return clients.map(mapClient);
}

export async function getVisitBundle(visitId: string) {
  const prisma = getPrisma();
  const visit = await prisma.visitSession.findUnique({
    where: { id: visitId },
    include: visitInclude,
  });
  if (!visit) return null;
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: visit.clientId } });
  const auditEvents = await prisma.auditEvent.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });
  const followUpTasks = await prisma.followUpTask.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });

  return mapVisitBundle({ visit, client, auditEvents, followUpTasks });
}

export async function getVisitBundles() {
  const prisma = getPrisma();
  const visits = await prisma.visitSession.findMany({
    include: visitInclude,
    orderBy: { scheduledStart: "asc" },
  });

  return Promise.all(visits.map((visit) => getVisitBundle(visit.id))).then((bundles) =>
    bundles.filter((bundle): bundle is NonNullable<typeof bundle> => Boolean(bundle)),
  );
}

function checklistTemplates() {
  return [
    {
      sequence: 1,
      category: "wellbeing",
      prompt: "Ask how Maggie is feeling today and listen for any reported changes such as dizziness.",
    },
    {
      sequence: 2,
      category: "nutrition",
      prompt: "Check that meals or food are visible and note any concern about food availability.",
    },
    {
      sequence: 3,
      category: "falls_hazard",
      prompt: "Scan the entry and hallway walking path for curled rugs, cords, clutter, spills, or low lighting.",
    },
    {
      sequence: 4,
      category: "medication_supply",
      prompt: "Check whether medication supply appears enough until the next visit. Do not advise dose or changes.",
    },
    {
      sequence: 5,
      category: "service_request",
      prompt: "Ask whether Maggie has service requests, booking questions, or anything the office should follow up.",
    },
    {
      sequence: 6,
      category: "close_out",
      prompt: "Close the visit by confirming what will be reported and whether any follow-up is needed.",
    },
  ] as const;
}

export async function seedVisitChecklist(visitId: string) {
  const prisma = getPrisma();
  const existing = await prisma.visitChecklistItem.findMany({
    where: { visitId },
    orderBy: { sequence: "asc" },
  });
  if (existing.length) return existing.map(mapVisitChecklistItem);

  const visit = await prisma.visitSession.findUniqueOrThrow({ where: { id: visitId } });
  const nowValue = now();
  await prisma.visitChecklistItem.createMany({
    data: checklistTemplates().map((item) => ({
      id: `check_${randomUUID()}`,
      visitId,
      sequence: item.sequence,
      category: item.category,
      prompt: item.prompt,
      status: item.sequence === 1 ? "active" : "pending",
      evidenceTranscript: null,
      linkedObservationId: null,
      createdAt: nowValue,
      updatedAt: nowValue,
      completedAt: null,
    })),
  });
  await addAuditEvent({
    actorId: visit.workerId,
    actorRole: "worker",
    visitId,
    clientId: visit.clientId,
    eventType: "CHECKLIST_PROMPTED",
    summary: "Care-plan welfare checklist seeded for the visit.",
    safetyFlags: ["manual_notes_consent_required", "worker_review_required"],
  });
  const rows = await prisma.visitChecklistItem.findMany({ where: { visitId }, orderBy: { sequence: "asc" } });
  return rows.map(mapVisitChecklistItem);
}

async function requireChecklistConsent(visitId: string, needsVoice: boolean) {
  const bundle = await getVisitBundle(visitId);
  if (!bundle) throw new Error("Visit not found.");
  const consent = bundle.visit.consentEvents.at(-1);
  if (consent?.consentState !== "granted" || !consent.scope.includes("manual_notes")) {
    throw new Error("Checklist capture requires granted manual notes consent.");
  }
  if (needsVoice && !consent.scope.includes("voice_note")) {
    throw new Error("Voice checklist capture requires granted voice note consent.");
  }
  return bundle;
}

function terminalChecklistStatus(status: VisitChecklistItem["status"]) {
  return status === "done" || status === "skipped" || status === "concern";
}

function inferChecklistObservation(input: {
  item: VisitChecklistItem;
  status: VisitChecklistItem["status"];
  evidenceTranscript: string;
  actorId: string;
}): Observation | null {
  if (input.status === "skipped" || input.status === "pending" || input.status === "active") return null;

  const evidence = input.evidenceTranscript.trim();
  const lower = `${input.item.prompt} ${evidence}`.toLowerCase();
  const concern = input.status === "concern";
  const capturedAt = now().toISOString();
  const base = {
    id: `obs_${randomUUID()}`,
    visitId: input.item.visitId,
    evidence: {
      type: "voice_transcript" as const,
      uri: null,
      summary: evidence ? `Checklist transcript: ${evidence}` : "Checklist item completed by worker.",
      redactionStatus: "not_required" as const,
    },
    capturedBy: input.actorId,
    captureMode: "manual_checklist" as const,
    capturedAt,
    requiresHumanReview: true,
    unknownReason: null,
  };

  const evidenceWithPhoto = (usePhoto: boolean) => {
    const photo = usePhoto ? demoEvidenceForChecklistCategory(input.item.category) : null;
    if (!photo) return base.evidence;
    return {
      ...base.evidence,
      uri: photo.imageSrc,
      summary: `${photo.summary} Transcript: ${evidence || photo.transcript}`,
    };
  };

  if (input.item.category === "falls_hazard") {
    const rug = /rug|mat|curled|loose|trip/.test(lower);
    return ObservationSchema.parse({
      ...base,
      category: "falls_hazard",
      label: concern && rug ? "Curled or loose rug concern" : "Walking path hazard check",
      status: concern ? "observed" : "not_observed",
      evidence: evidenceWithPhoto(concern && rug),
      description: concern
        ? `Worker flagged a walking-path hazard concern. ${evidence || input.item.prompt}`
        : "Worker completed the walking-path hazard check and did not report a hazard concern.",
      confidence: concern ? "medium" : "low",
      isSensitive: false,
    });
  }

  if (input.item.category === "medication_supply") {
    const supplyConcern = concern || /few|low|empty|missing|run out|short|not enough/.test(lower);
    return ObservationSchema.parse({
      ...base,
      category: "medication_related_observation",
      label: supplyConcern ? "Medication supply concern" : "Medication supply check completed",
      status: supplyConcern ? "observed" : "unknown",
      evidence: evidenceWithPhoto(supplyConcern),
      description: supplyConcern
        ? `Worker reported a medication supply concern for human follow-up only. ${evidence}`
        : "Worker checked medication supply but did not assess medication use, dose, or clinical appropriateness.",
      confidence: supplyConcern ? "medium" : "low",
      isSensitive: true,
      unknownReason: supplyConcern ? null : "Medication use and clinical sufficiency are outside worker scope.",
    });
  }

  if (input.item.category === "nutrition") {
    const nutritionConcern = concern || /no food|not enough|empty|missing|few meals/.test(lower);
    return ObservationSchema.parse({
      ...base,
      category: "nutrition",
      label: nutritionConcern ? "Food availability concern" : "Meals or food checked",
      status: nutritionConcern ? "not_observed" : "observed",
      description: nutritionConcern
        ? `Worker reported a food availability concern. ${evidence}`
        : "Worker completed the food availability check.",
      confidence: "medium",
      isSensitive: false,
    });
  }

  if (input.item.category === "wellbeing") {
    const dizziness = /dizz|light.?headed|unsteady/.test(lower);
    return ObservationSchema.parse({
      ...base,
      category: "wellbeing",
      label: dizziness ? "Dizziness reported during checklist" : "Wellbeing check completed",
      status: "observed",
      evidence: evidenceWithPhoto(dizziness),
      description: dizziness
        ? `Client reported dizziness or unsteadiness for supervisor follow-up. ${evidence}`
        : `Worker completed wellbeing check. ${evidence || "No specific concern was recorded."}`,
      confidence: dizziness ? "medium" : "low",
      isSensitive: dizziness,
    });
  }

  if (input.item.category === "service_request") {
    return ObservationSchema.parse({
      ...base,
      category: "service_delivery",
      label: concern ? "Service request needs follow-up" : "Service request check completed",
      status: "observed",
      description: evidence || "Worker checked for service requests.",
      confidence: "medium",
      isSensitive: false,
    });
  }

  return ObservationSchema.parse({
    ...base,
    category: "service_delivery",
    label: "Visit close-out completed",
    status: "observed",
    description: evidence || "Worker completed the visit close-out checklist item.",
    confidence: "low",
    isSensitive: false,
  });
}

async function recordChecklistLiveEventIfAllowed(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  eventType: "checklist_prompt" | "checklist_response";
  payload: Record<string, unknown>;
}) {
  const bundle = await getVisitBundle(input.visitId);
  const consent = bundle?.visit.consentEvents.at(-1);
  if (!consentAllowsRayBanLive(consent)) return;
  await addLiveRayBanEvent({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: input.eventType,
    payload: input.payload,
  });
}

async function activateNextChecklistItem(input: { visitId: string; actorId: string; actorRole: Role }) {
  const prisma = getPrisma();
  const next = await prisma.visitChecklistItem.findFirst({
    where: { visitId: input.visitId, status: "pending" },
    orderBy: { sequence: "asc" },
  });
  if (!next) return null;
  const row = await prisma.visitChecklistItem.update({
    where: { id: next.id },
    data: { status: "active" },
  });
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    eventType: "CHECKLIST_PROMPTED",
    summary: `Checklist prompt activated: ${row.prompt}`,
    safetyFlags: ["audio_guided_checklist"],
  });
  await recordChecklistLiveEventIfAllowed({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: "checklist_prompt",
    payload: { itemId: row.id, sequence: row.sequence, prompt: row.prompt, category: row.category },
  });
  return mapVisitChecklistItem(row);
}

export async function getChecklistItems(visitId: string) {
  return seedVisitChecklist(visitId);
}

export async function updateChecklistItem(input: {
  visitId: string;
  itemId: string;
  actorId: string;
  actorRole: Role;
  status: VisitChecklistItem["status"];
  evidenceTranscript?: string;
  voice?: boolean;
}) {
  await seedVisitChecklist(input.visitId);
  await requireChecklistConsent(input.visitId, Boolean(input.voice));
  const status = ChecklistItemStatusSchema.parse(input.status);
  const evidenceTranscript = input.evidenceTranscript?.trim() || null;
  const prisma = getPrisma();
  const existing = await prisma.visitChecklistItem.findFirstOrThrow({
    where: { id: input.itemId, visitId: input.visitId },
  });

  let linkedObservationId = existing.linkedObservationId;
  const itemForObservation = mapVisitChecklistItem(existing);
  const observation = inferChecklistObservation({
    item: itemForObservation,
    status,
    evidenceTranscript: evidenceTranscript ?? "",
    actorId: input.actorId,
  });
  if (observation && !linkedObservationId) {
    const [created] = await addObservations({
      visitId: input.visitId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      observations: [observation],
    });
    linkedObservationId = created.id;
    await refreshEscalation(input.visitId, input.actorId, input.actorRole);
  }

  const completedAt = terminalChecklistStatus(status) ? now() : null;
  const updated = await prisma.visitChecklistItem.update({
    where: { id: input.itemId },
    data: {
      status,
      evidenceTranscript,
      linkedObservationId,
      completedAt,
    },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    eventType: "CHECKLIST_ITEM_UPDATED",
    summary: `Checklist item ${updated.sequence} marked ${status}.`,
    safetyFlags: input.voice ? ["voice_checklist"] : ["tap_checklist"],
  });
  await recordChecklistLiveEventIfAllowed({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: "checklist_response",
    payload: {
      itemId: updated.id,
      sequence: updated.sequence,
      prompt: updated.prompt,
      category: updated.category,
      status,
      evidenceTranscript,
      linkedObservationId,
    },
  });

  if (terminalChecklistStatus(status)) {
    await activateNextChecklistItem({ visitId: input.visitId, actorId: input.actorId, actorRole: input.actorRole });
  }

  const rows = await prisma.visitChecklistItem.findMany({
    where: { visitId: input.visitId },
    orderBy: { sequence: "asc" },
  });
  return rows.map(mapVisitChecklistItem);
}

function parseVoiceChecklistStatus(transcript: string): VisitChecklistItem["status"] {
  const lower = transcript.trim().toLowerCase();
  if (!lower) throw new Error("Voice checklist transcript is required.");
  if (/\b(skip|unable|cannot|can't|not safe|not now)\b/.test(lower)) return "skipped";
  if (/\b(concern|issue|problem|hazard|curled|loose|dizzy|dizziness|too few|not enough|run out|low supply)\b/.test(lower)) {
    return "concern";
  }
  if (/\b(done|complete|completed|checked|finished|yes)\b/.test(lower)) return "done";
  throw new Error("Voice command must include done, skip, or concern.");
}

export async function applyChecklistVoiceCommand(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  transcript: string;
  itemId?: string;
}) {
  const checklist = await seedVisitChecklist(input.visitId);
  await requireChecklistConsent(input.visitId, true);
  const active =
    (input.itemId ? checklist.find((item) => item.id === input.itemId) : undefined) ??
    checklist.find((item) => item.status === "active") ??
    checklist.find((item) => item.status === "pending");
  if (!active) throw new Error("Checklist is already complete.");
  const status = parseVoiceChecklistStatus(input.transcript);
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    eventType: "CHECKLIST_VOICE_COMMAND",
    summary: `Voice checklist command parsed as ${status}.`,
    safetyFlags: ["voice_transcript_stored_as_artifact"],
  });
  const checklistItems = await updateChecklistItem({
    visitId: input.visitId,
    itemId: active.id,
    actorId: input.actorId,
    actorRole: input.actorRole,
    status,
    evidenceTranscript: input.transcript,
    voice: true,
  });
  return { status, checklistItems };
}

export async function addConsentEvent(input: Omit<ConsentEvent, "id" | "recordedAt"> & { actorRole?: Role }) {
  const prisma = getPrisma();
  const visit = await prisma.visitSession.findUniqueOrThrow({ where: { id: input.visitId } });
  const scope = input.scope;
  const includesMedia = scope.includes("phone_photo") || scope.includes("rayban_media");
  if (input.consentState !== "granted" && includesMedia) {
    throw new Error("Media scopes require granted consent.");
  }

  const { actorRole, ...eventInput } = input;
  const event = ConsentEventSchema.parse({
    ...eventInput,
    id: `consent_${randomUUID()}`,
    recordedAt: now().toISOString(),
  });

  const created = await prisma.consentEvent.create({
    data: {
      id: event.id,
      visitId: event.visitId,
      clientId: event.clientId,
      actorId: event.actorId,
      consentState: event.consentState,
      scopeJson: json(event.scope),
      captureModesAllowedJson: json(event.captureModesAllowed),
      notes: event.notes,
      recordedAt: new Date(event.recordedAt),
    },
  });

  await prisma.visitSession.update({
    where: { id: event.visitId },
    data: {
      actualStart: visit.actualStart ?? now(),
      status: "in_progress",
      captureModesUsedJson: json([...new Set([...JSON.parse(visit.captureModesUsedJson), ...event.captureModesAllowed])]),
    },
  });

  await addAuditEvent({
    actorId: event.actorId,
    actorRole: actorRole ?? "worker",
    visitId: event.visitId,
    clientId: event.clientId,
    eventType: "CONSENT_RECORDED",
    summary: `Consent ${event.consentState}; scopes: ${formatConsentScopes(event.scope)}.`,
    safetyFlags: event.consentState === "granted" ? ["consent_recorded"] : ["safe_mode_required"],
  });

  return mapConsent(created);
}

export async function addObservations(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  observations: Observation[];
}) {
  const prisma = getPrisma();
  const visit = await prisma.visitSession.findUniqueOrThrow({ where: { id: input.visitId } });
  const captureModes = new Set<CaptureMode>(JSON.parse(visit.captureModesUsedJson));

  const created = [];
  for (const rawObservation of input.observations) {
    const observation = ObservationSchema.parse(rawObservation);
    captureModes.add(observation.captureMode);
    created.push(
      await prisma.observation.create({
        data: {
          id: observation.id,
          visitId: observation.visitId,
          category: observation.category,
          label: observation.label,
          status: observation.status,
          description: observation.description,
          evidenceJson: json(observation.evidence),
          confidence: observation.confidence,
          capturedBy: observation.capturedBy,
          captureMode: observation.captureMode,
          capturedAt: new Date(observation.capturedAt),
          isSensitive: observation.isSensitive,
          requiresHumanReview: observation.requiresHumanReview,
          unknownReason: observation.unknownReason,
        },
      }),
    );
  }

  await prisma.visitSession.update({
    where: { id: input.visitId },
    data: { captureModesUsedJson: json([...captureModes]), status: "review" },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: visit.clientId,
    eventType: "OBSERVATION_CREATED",
    summary: `${created.length} structured observation(s) saved.`,
    safetyFlags: ["unknown_defaults_supported", "human_review_required"],
  });

  return created.map((row) =>
    ObservationSchema.parse({
      id: row.id,
      visitId: row.visitId,
      category: row.category,
      label: row.label,
      status: row.status,
      description: row.description,
      evidence: JSON.parse(row.evidenceJson),
      confidence: row.confidence,
      capturedBy: row.capturedBy,
      captureMode: row.captureMode,
      capturedAt: row.capturedAt.toISOString(),
      isSensitive: row.isSensitive,
      requiresHumanReview: row.requiresHumanReview,
      unknownReason: row.unknownReason,
    }),
  );
}

export async function structureRawNote(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  rawNote: string;
  captureMode: CaptureMode;
}) {
  const prisma = getPrisma();
  const visit = await prisma.visitSession.findUniqueOrThrow({ where: { id: input.visitId } });
  const unsafe = detectUnsafeContent(input.rawNote);
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: visit.clientId,
    eventType: "AI_GENERATION_REQUESTED",
    summary: "Raw note structuring requested.",
    safetyFlags: unsafe.safeModeRequired ? unsafe.blockedReasons : ["stub_ai"],
  });

  if (unsafe.safeModeRequired) {
    await addAuditEvent({
      actorId: input.actorId,
      actorRole: input.actorRole,
      visitId: input.visitId,
      clientId: visit.clientId,
      eventType: "SAFE_MODE_TRIGGERED",
      summary: unsafe.refusalTemplate ?? "Safe mode triggered for raw note.",
      safetyFlags: unsafe.blockedReasons,
    });
    throw new Error(unsafe.refusalTemplate ?? "Safe mode required.");
  }

  const observations = await stubAIProvider.structureRawNotes({
    visitId: input.visitId,
    workerId: input.actorId,
    capturedAt: now().toISOString(),
    captureMode: input.captureMode,
    rawNote: input.rawNote,
  });
  await addObservations({ visitId: input.visitId, actorId: input.actorId, actorRole: input.actorRole, observations });
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: visit.clientId,
    eventType: "AI_GENERATION_COMPLETED",
    summary: "Raw note converted into validated structured observations.",
    safetyFlags: ["schema_validated", "no_diagnosis", "no_medication_advice"],
  });
  await refreshEscalation(input.visitId, input.actorId, input.actorRole);
  return observations;
}

function consentAllowsMedia(consent: ConsentEvent | undefined, source: MediaAsset["source"]) {
  if (!consent || consent.consentState !== "granted") return false;
  if (source === "rayban_meta") return consent.scope.includes("rayban_media") && consent.captureModesAllowed.includes("rayban_media_upload");
  return consent.scope.includes("phone_photo") && consent.captureModesAllowed.includes("phone_photo");
}

function consentAllowsRayBanLive(consent: ConsentEvent | undefined) {
  if (!consent || consent.consentState !== "granted") return false;
  const hasScopes = consent.scope.includes("rayban_media") && consent.scope.includes("voice_note");
  const explicitLive = consent.captureModesAllowed.includes("rayban_live_assist");
  const legacyLive = consent.captureModesAllowed.includes("rayban_media_upload") && consent.captureModesAllowed.includes("voice_transcript");
  return hasScopes && (explicitLive || legacyLive);
}

async function getLiveConsentBundle(visitId: string) {
  const bundle = await getVisitBundle(visitId);
  if (!bundle) throw new Error("Visit not found.");
  if (!consentAllowsRayBanLive(bundle.visit.consentEvents.at(-1))) {
    throw new Error("Worker Glasses requires granted consent for both media and voice note.");
  }
  return bundle;
}

export async function startLiveRayBanSession(input: { visitId: string; actorId: string; actorRole: Role }) {
  const bundle = await getLiveConsentBundle(input.visitId);
  const sessionToken = `worker_glasses_${randomUUID()}`;
  const event = await addLiveRayBanEvent({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: "session_started",
    payload: {
      bridge: "meta_wearables_dat_companion",
      sessionToken,
      frameEndpoint: `/api/visits/${input.visitId}/worker-glasses/frame`,
      startedAt: now().toISOString(),
    },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "LIVE_RAYBAN_SESSION_STARTED",
    summary: "Worker Glasses session started.",
    safetyFlags: ["consent_required", "private_contexts_blocked", "human_review_required"],
  });

  return event;
}

async function requireActiveLiveRayBanSession(visitId: string, sessionToken: string) {
  const events = await getLiveRayBanEvents(visitId);
  const lastStarted = events.findLast((event) => event.eventType === "session_started");
  const lastEnded = events.findLast((event) => event.eventType === "session_ended");
  const startedAt = lastStarted ? new Date(lastStarted.createdAt).getTime() : 0;
  const endedAt = lastEnded ? new Date(lastEnded.createdAt).getTime() : 0;
  const activeToken = typeof lastStarted?.payload.sessionToken === "string" ? lastStarted.payload.sessionToken : "";
  if (!activeToken || activeToken !== sessionToken || endedAt > startedAt) {
    throw new Error("Invalid or inactive Worker Glasses session token.");
  }
}

export async function getLiveRayBanEvents(visitId: string) {
  const prisma = getPrisma();
  const rows = await prisma.liveRayBanEvent.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapLiveRayBanEvent);
}

export async function addLiveRayBanEvent(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  eventType: LiveRayBanEventType;
  payload: Record<string, unknown>;
}) {
  await getLiveConsentBundle(input.visitId);
  const eventType = LiveRayBanEventTypeSchema.parse(input.eventType);
  const context = typeof input.payload.context === "string" ? input.payload.context : "";
  if (context && isPrivateCaptureContext(context)) {
    throw new Error("Private-room and personal-care Worker Glasses capture is blocked.");
  }

  const event = LiveRayBanEventSchema.parse({
    id: `live_${randomUUID()}`,
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType,
    payload: input.payload,
    createdAt: now().toISOString(),
  });

  const prisma = getPrisma();
  const created = await prisma.liveRayBanEvent.create({
    data: {
      id: event.id,
      visitId: event.visitId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      eventType: event.eventType,
      payloadJson: json(event.payload),
      createdAt: new Date(event.createdAt),
    },
  });

  if (event.eventType === "hazard_candidate") {
    const bundle = await getVisitBundle(input.visitId);
    await addAuditEvent({
      actorId: input.actorId,
      actorRole: input.actorRole,
      visitId: input.visitId,
      clientId: bundle?.client.id ?? null,
      eventType: "LIVE_RAYBAN_EVENT_RECEIVED",
      summary: "Worker Glasses hazard candidate received.",
      safetyFlags: ["not_saved_until_worker_ends", "human_review_required"],
    });
  }

  return mapLiveRayBanEvent(created);
}

export async function addLiveRayBanTranscript(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  text: string;
}) {
  const text = input.text.trim();
  if (!text) throw new Error("Transcript text is required.");
  const event = await addLiveRayBanEvent({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: "transcript_chunk",
    payload: { text, receivedAt: now().toISOString() },
  });

  const hazards = detectLiveHazards(text, event.createdAt);
  for (const hazard of hazards) {
    await addLiveRayBanEvent({
      visitId: input.visitId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      eventType: "hazard_candidate",
      payload: hazard,
    });
  }

  return { event, hazards };
}

export async function answerLiveRayBanQuestion(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  question: string;
}) {
  const bundle = await getLiveConsentBundle(input.visitId);
  const question = input.question.trim();
  if (!question) throw new Error("Question is required.");
  const answeredAt = now().toISOString();
  const answer = answerLiveServiceQuestion(question, bundle.client);
  const event = await addLiveRayBanEvent({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: "question_answer",
    payload: {
      question,
      answer: answer.answer,
      safetyFlags: answer.safetyFlags,
      answeredAt,
    },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "LIVE_RAYBAN_QUESTION_ANSWERED",
    summary: "Worker Glasses service question answered with provider-confirmation guardrails.",
    safetyFlags: answer.safetyFlags,
  });

  return { event, answer };
}

export async function endLiveRayBanSession(input: { visitId: string; actorId: string; actorRole: Role }) {
  const bundle = await getLiveConsentBundle(input.visitId);
  const endedAt = now().toISOString();
  const eventsBeforeEnd = await getLiveRayBanEvents(input.visitId);
  await addLiveRayBanEvent({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    eventType: "session_ended",
    payload: { endedAt },
  });

  const observations = observationsFromLiveRayBanEvents({
    visitId: input.visitId,
    actorId: input.actorId,
    events: eventsBeforeEnd,
    endedAt,
  });

  let saved: Observation[] = [];
  if (observations.length) {
    saved = await addObservations({
      visitId: input.visitId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      observations,
    });
    await refreshEscalation(input.visitId, input.actorId, input.actorRole);
  }

  const hazardObservationIds = saved
    .filter((observation) => observation.label === "Worker Glasses hazard summary")
    .map((observation) => observation.id);
  const hazardFrameIds = [
    ...new Set(
      eventsBeforeEnd
        .filter((event) => event.eventType === "hazard_candidate" && event.payload.saveSnapshot === true)
        .map((event) => (typeof event.payload.frameId === "string" ? event.payload.frameId : ""))
        .filter(Boolean),
    ),
  ];
  for (const frameId of hazardFrameIds) {
    const frame = getLiveRayBanFrameBuffer().get(input.visitId, frameId);
    if (!frame) continue;
    await addMediaAsset({
      visitId: input.visitId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      source: "rayban_meta",
      captureContext: frame.captureContext,
      fileName: `worker-glasses-hazard-${frame.frameId}.jpg`,
      mimeType: frame.mimeType,
      previewDataUrl: frame.dataUrl,
      linkedObservationIds: hazardObservationIds,
    });
  }

  const prisma = getPrisma();
  await prisma.visitSession.update({
    where: { id: input.visitId },
    data: { actualEnd: new Date(endedAt), status: "review" },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "LIVE_RAYBAN_SESSION_ENDED",
    summary: `${observations.length} Worker Glasses summary observation(s) saved when worker ended the session.`,
    safetyFlags: ["saved_on_end_only", "human_review_required", "no_raw_live_video_stored"],
  });

  getLiveRayBanFrameBuffer().clear(input.visitId);

  return saved;
}

export async function addLiveRayBanFrame(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  frameId: string;
  sessionToken: string;
  captureContext: string;
  dataUrl?: string;
  jpegBase64?: string;
  sentAt?: string;
}) {
  await getLiveConsentBundle(input.visitId);
  await requireActiveLiveRayBanSession(input.visitId, input.sessionToken);
  const captureContext = CaptureContextSchema.parse(input.captureContext || "hallway");
  if (isPrivateCaptureContext(captureContext)) {
    throw new Error("Private-room and personal-care Worker Glasses frame capture is blocked.");
  }
  const dataUrl = input.dataUrl ?? `data:image/jpeg;base64,${input.jpegBase64 ?? ""}`;
  const frame = LiveRayBanFrameSchema.parse({
    visitId: input.visitId,
    frameId: input.frameId || `frame_${randomUUID()}`,
    sessionToken: input.sessionToken,
    captureContext,
    mimeType: "image/jpeg",
    dataUrl,
    sentAt: input.sentAt ?? now().toISOString(),
    receivedAt: now().toISOString(),
  });
  return getLiveRayBanFrameBuffer().put(frame);
}

export function getLatestLiveRayBanFrame(visitId: string) {
  return getLiveRayBanFrameBuffer().latest(visitId);
}

export async function saveLiveRayBanSnapshot(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  sessionToken: string;
  frameId?: string;
  captureContext?: string;
}) {
  await getLiveConsentBundle(input.visitId);
  await requireActiveLiveRayBanSession(input.visitId, input.sessionToken);
  const frame = input.frameId
    ? getLiveRayBanFrameBuffer().get(input.visitId, input.frameId)
    : getLiveRayBanFrameBuffer().latest(input.visitId);
  if (!frame) throw new Error("No Worker Glasses frame is available to snapshot.");
  const captureContext = CaptureContextSchema.parse(input.captureContext ?? frame.captureContext);
  if (isPrivateCaptureContext(captureContext)) {
    throw new Error("Private-room and personal-care snapshot capture is blocked. Use safe mode with manual notes.");
  }

  return addMediaAsset({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    source: "rayban_meta",
    captureContext,
    fileName: `worker-glasses-snapshot-${frame.frameId}.jpg`,
    mimeType: frame.mimeType,
    previewDataUrl: frame.dataUrl,
  });
}

export async function addMediaAsset(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  source: MediaAsset["source"];
  captureContext: MediaAsset["captureContext"];
  fileName: string;
  mimeType: string;
  previewDataUrl: string;
  linkedObservationIds?: string[];
}) {
  if (isPrivateCaptureContext(input.captureContext)) {
    throw new Error("Private-room and personal-care capture is blocked. Use safe mode with manual notes.");
  }

  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  const lastConsent = bundle.visit.consentEvents.at(-1);
  if (!consentAllowsMedia(lastConsent, input.source)) {
    throw new Error(
      input.source === "rayban_meta"
        ? "Worker Glasses media requires granted consent."
        : "Selected media source requires granted consent.",
    );
  }

  const prisma = getPrisma();
  const media = MediaAssetSchema.parse({
    id: `media_${randomUUID()}`,
    visitId: input.visitId,
    source: input.source,
    captureContext: input.captureContext,
    consentEventId: lastConsent?.id ?? null,
    redactionStatus: "pending",
    fileName: input.fileName || (input.source === "rayban_meta" ? "worker-glasses-capture.jpg" : "visit-photo.jpg"),
    mimeType: input.mimeType || "image/jpeg",
    previewDataUrl: input.previewDataUrl || "",
    linkedObservationIds: input.linkedObservationIds ?? [],
    workerReviewed: false,
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  });

  const created = await prisma.mediaAsset.create({
    data: {
      id: media.id,
      visitId: media.visitId,
      source: media.source,
      captureContext: media.captureContext,
      consentEventId: media.consentEventId,
      redactionStatus: media.redactionStatus,
      fileName: media.fileName,
      mimeType: media.mimeType,
      previewDataUrl: media.previewDataUrl,
      linkedObservationIdsJson: json(media.linkedObservationIds),
      workerReviewed: media.workerReviewed,
      createdAt: new Date(media.createdAt),
      updatedAt: new Date(media.updatedAt),
    },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "MEDIA_UPLOADED",
    summary: `${input.source === "rayban_meta" ? "Worker Glasses" : "Visit"} media imported for ${input.captureContext}.`,
    safetyFlags: ["consent_required", "redaction_pending", "worker_review_required"],
  });

  return mapMedia(created);
}

export async function applyRedaction(input: {
  visitId: string;
  actorId: string;
  actorRole: Role;
  mediaId: string;
  status: RedactionEvent["status"];
}) {
  const prisma = getPrisma();
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  const media = bundle.visit.mediaAssets.find((asset) => asset.id === input.mediaId);
  if (!media) throw new Error("Media not found.");

  const redaction = RedactionEventSchema.parse({
    id: `redact_${randomUUID()}`,
    visitId: input.visitId,
    mediaId: input.mediaId,
    status: input.status,
    redactionTypes: input.status === "applied" ? ["background_person_blur"] : ["none"],
    notes:
      input.status === "applied"
        ? "Redaction review applied. No raw continuous video is stored."
        : "Redaction was not applied; media cannot be used in generated outputs.",
    processedBy: "demo_redaction_stub",
    processedAt: now().toISOString(),
  });

  await prisma.redactionEvent.create({
    data: {
      id: redaction.id,
      visitId: redaction.visitId,
      mediaId: redaction.mediaId,
      status: redaction.status,
      redactionTypesJson: json(redaction.redactionTypes),
      notes: redaction.notes,
      processedBy: redaction.processedBy,
      processedAt: new Date(redaction.processedAt),
    },
  });

  const linkedObservationIds =
    redaction.status === "applied"
      ? bundle.visit.observations
          .filter((observation) => observation.category === "falls_hazard" || /rug|hallway/i.test(observation.label))
          .map((observation) => observation.id)
      : [];

  await prisma.mediaAsset.update({
    where: { id: input.mediaId },
    data: {
      redactionStatus: redaction.status,
      linkedObservationIdsJson: json(linkedObservationIds),
      workerReviewed: redaction.status === "applied",
    },
  });

  if (redaction.status === "applied") {
    await Promise.all(
      linkedObservationIds.map((id) =>
        prisma.observation.update({
          where: { id },
          data: {
            evidenceJson: json({
              type: media.source === "rayban_meta" ? "rayban_media" : "photo",
              uri: media.previewDataUrl,
              summary:
                media.source === "rayban_meta"
                  ? "Observed in Worker Glasses media after consent, redaction, and worker review."
                  : "Observed in visit media after consent, redaction, and worker review.",
              redactionStatus: "applied",
            }),
          },
        }),
      ),
    );
  }

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "REDACTION_APPLIED",
    summary: redaction.notes,
    safetyFlags: redaction.status === "applied" ? ["redaction_applied", "demo_stub"] : ["safe_mode_required"],
  });

  return redaction;
}

export async function refreshEscalation(visitId: string, actorId = "worker_001", actorRole: Role = "worker") {
  const bundle = await getVisitBundle(visitId);
  if (!bundle) throw new Error("Visit not found.");
  const scored = scoreRisk({
    client: bundle.client,
    observations: bundle.visit.observations,
    existingEscalation: bundle.visit.escalation,
  });
  const prisma = getPrisma();
  const row = await prisma.escalation.upsert({
    where: { visitId },
    create: {
      id: scored.id,
      visitId,
      riskLevel: scored.riskLevel,
      status: scored.status,
      reason: scored.reason,
      recommendedAction: scored.recommendedAction,
      assignedTo: scored.assignedTo,
      createdAt: new Date(scored.createdAt),
      updatedAt: new Date(scored.updatedAt),
    },
    update: {
      riskLevel: scored.riskLevel,
      status: scored.status,
      reason: scored.reason,
      recommendedAction: scored.recommendedAction,
      assignedTo: scored.assignedTo,
      updatedAt: now(),
    },
  });

  if (row.status !== "none") {
    await addAuditEvent({
      actorId,
      actorRole,
      visitId,
      clientId: bundle.client.id,
      eventType: row.status === "draft" ? "ESCALATION_CREATED" : "ESCALATION_UPDATED",
      summary: `${row.riskLevel} escalation: ${row.reason}`,
      safetyFlags: ["exception_queue", "non_clinical_workflow_only"],
    });
  }

  return row;
}

export async function generateVisitPack(input: { visitId: string; actorId: string; actorRole: Role }) {
  await refreshEscalation(input.visitId, input.actorId, input.actorRole);
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  if (bundle.visit.observations.length === 0) throw new Error("Add observations before generating outputs.");

  const hasReviewedRedactedRaybanMedia = bundle.visit.mediaAssets.some(
    (media) => media.source === "rayban_meta" && media.redactionStatus === "applied" && media.workerReviewed,
  );
  const pendingMedia = bundle.visit.mediaAssets.some((media) => ["pending", "failed"].includes(media.redactionStatus));
  const prisma = getPrisma();

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "AI_GENERATION_REQUESTED",
    summary: "Generate visit pack requested.",
    safetyFlags: pendingMedia ? ["media_blocked_until_redaction"] : ["stub_ai"],
  });

  const generationInput = {
    visit: bundle.visit,
    client: bundle.client,
    observations: bundle.visit.observations,
    escalation: bundle.visit.escalation,
    hasReviewedRedactedRaybanMedia,
  };

  const drafts = await Promise.all([
    stubAIProvider.generateWorkerNote(generationInput),
    stubAIProvider.generateProviderLog(generationInput),
    stubAIProvider.generateFamilySummary(generationInput),
  ]);

  await prisma.outputDocument.deleteMany({ where: { visitId: input.visitId } });
  const created: OutputDocument[] = [];
  for (const draft of drafts) {
    const unsafe = detectUnsafeContent(draft.body);
    const output = OutputDocumentSchema.parse({
      id: `doc_${draft.type}_${randomUUID()}`,
      visitId: input.visitId,
      type: draft.type,
      status: "needs_review",
      title: draft.title,
      body: draft.body,
      safetyFlags: [...draft.safetyFlags, ...(unsafe.safeModeRequired ? unsafe.blockedReasons : [])],
      evidenceObservationIds: draft.evidenceObservationIds,
      generatedAt: now().toISOString(),
      generatedBy: "ai_stub",
      approvedBy: null,
      approvedAt: null,
    });
    const row = await prisma.outputDocument.create({
      data: {
        id: output.id,
        visitId: output.visitId,
        type: output.type,
        status: output.status,
        title: output.title,
        body: output.body,
        safetyFlagsJson: json(output.safetyFlags),
        evidenceObservationIdsJson: json(output.evidenceObservationIds),
        generatedAt: new Date(output.generatedAt),
        generatedBy: output.generatedBy,
        approvedBy: output.approvedBy,
        approvedAt: output.approvedAt ? new Date(output.approvedAt) : null,
      },
    });
    created.push(mapOutput(row));
  }

  await prisma.visitSession.update({
    where: { id: input.visitId },
    data: { status: "review" },
  });

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "AI_GENERATION_COMPLETED",
    summary: "Worker note, provider log, and family summary generated as drafts.",
    safetyFlags: ["schema_validated", "human_signoff_required"],
  });

  return created;
}

export async function signOffOutput(input: {
  visitId: string;
  outputId: string;
  actorId: string;
  actorRole: Role;
}) {
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  const output = bundle.visit.outputs.find((candidate) => candidate.id === input.outputId);
  if (!output) throw new Error("Output not found.");

  if (input.actorRole === "worker" && output.type !== "worker_note") {
    throw new Error("Worker can only sign off the worker note.");
  }
  if (output.type === "family_summary" && input.actorRole !== "supervisor") {
    throw new Error("Family summary requires supervisor approval.");
  }
  if (output.type === "provider_compliance_log" && input.actorRole !== "supervisor") {
    throw new Error("Provider compliance log requires supervisor approval.");
  }

  const prisma = getPrisma();
  const row = await prisma.outputDocument.update({
    where: { id: input.outputId },
    data: {
      status: "approved",
      approvedBy: input.actorId,
      approvedAt: now(),
    },
  });

  if (output.type === "worker_note") {
    await prisma.visitSession.update({
      where: { id: input.visitId },
      data: {
        humanSignoffJson: json({
          required: true,
          signedOffBy: input.actorId,
          signedOffAt: now().toISOString(),
          notes: "Worker reviewed the note, unknowns, safety constraints, consent, redaction, and escalation.",
        }),
      },
    });
  }

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: output.type === "family_summary" ? "FAMILY_SUMMARY_APPROVED" : "OUTPUT_APPROVED",
    summary: `${output.title} approved by ${input.actorRole}.`,
    safetyFlags: ["human_signoff_complete"],
  });

  return mapOutput(row);
}

export async function undoOutputSignOff(input: {
  visitId: string;
  outputId: string;
  actorId: string;
  actorRole: Role;
}) {
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  const output = bundle.visit.outputs.find((candidate) => candidate.id === input.outputId);
  if (!output) throw new Error("Output not found.");

  if (input.actorRole === "worker" && output.type !== "worker_note") {
    throw new Error("Worker can only undo the worker note sign-off.");
  }
  if (output.type === "family_summary" && input.actorRole !== "supervisor") {
    throw new Error("Family summary approval can only be undone by a supervisor.");
  }
  if (output.type === "provider_compliance_log" && input.actorRole !== "supervisor") {
    throw new Error("Provider compliance log approval can only be undone by a supervisor.");
  }

  const prisma = getPrisma();
  const row = await prisma.outputDocument.update({
    where: { id: input.outputId },
    data: {
      status: "draft",
      approvedBy: null,
      approvedAt: null,
    },
  });

  if (output.type === "worker_note") {
    await prisma.visitSession.update({
      where: { id: input.visitId },
      data: {
        humanSignoffJson: json({
          required: true,
          signedOffBy: null,
          signedOffAt: null,
          notes: "Worker note sign-off was undone in the demo flow.",
        }),
      },
    });
  }

  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "OUTPUT_APPROVAL_UNDONE",
    summary: `${output.title} approval undone by ${input.actorRole}.`,
    safetyFlags: ["human_signoff_reopened"],
  });

  return mapOutput(row);
}

type FollowUpTaskInput = {
  visitId: string;
  actorId: string;
  actorRole: Role;
  actionType: FollowUpActionType;
  priority: FollowUpTaskPriority;
  status?: FollowUpTaskStatus;
  title: string;
  recommendationReason: string;
  sourceObservationIds?: string[];
  assignedTo?: string | null;
  dueAt?: string | null;
};

function dueInDays(days: number) {
  const due = now();
  due.setUTCDate(due.getUTCDate() + days);
  return due.toISOString();
}

function observationText(observation: Observation) {
  return `${observation.label} ${observation.description} ${observation.unknownReason ?? ""}`.toLowerCase();
}

function recommendedFollowUps(bundle: NonNullable<Awaited<ReturnType<typeof getVisitBundle>>>): FollowUpTaskInput[] {
  const recommendations: FollowUpTaskInput[] = [];
  const hasKnownFallsRisk = bundle.client.knownRisks.some((risk) => /falls?/i.test(risk));
  const rugObservations = bundle.visit.observations.filter(
    (observation) => observation.category === "falls_hazard" && /rug|mat|curled|loose|trip/.test(observationText(observation)),
  );
  if (hasKnownFallsRisk && rugObservations.length) {
    recommendations.push({
      visitId: bundle.visit.id,
      actorId: "system",
      actorRole: "admin",
      actionType: "home_hazard",
      priority: "medium",
      title: "Confirm hallway rug is secured",
      recommendationReason: "A curled or loose rug was recorded and the client has a known falls risk.",
      sourceObservationIds: rugObservations.map((observation) => observation.id),
      assignedTo: "supervisor_001",
      dueAt: dueInDays(2),
    });
  }

  const dizzinessObservations = bundle.visit.observations.filter((observation) => /dizz|light.?headed|unsteady/.test(observationText(observation)));
  if (dizzinessObservations.length) {
    recommendations.push({
      visitId: bundle.visit.id,
      actorId: "system",
      actorRole: "admin",
      actionType: "phone_call",
      priority: "medium",
      title: "Phone check-in about reported dizziness",
      recommendationReason: "The client mentioned dizziness or unsteadiness; make a non-urgent check-in call tomorrow.",
      sourceObservationIds: dizzinessObservations.map((observation) => observation.id),
      assignedTo: "supervisor_001",
      dueAt: dueInDays(1),
    });
  }

  const medicationSupplyObservations = bundle.visit.observations.filter(
    (observation) =>
      observation.category === "medication_related_observation" &&
      /supply|few|low|empty|missing|run out|short|not enough|unknown|not assessed/.test(observationText(observation)),
  );
  if (medicationSupplyObservations.length) {
    recommendations.push({
      visitId: bundle.visit.id,
      actorId: "system",
      actorRole: "admin",
      actionType: "medication_supply_followup",
      priority: medicationSupplyObservations.some((observation) => /few|low|empty|run out|not enough/.test(observationText(observation)))
        ? "medium"
        : "low",
      title: "Check medication supply with authorised pathway",
      recommendationReason:
        "A medication-related supply uncertainty was recorded. Follow up through the provider pathway without giving medication advice.",
      sourceObservationIds: medicationSupplyObservations.map((observation) => observation.id),
      assignedTo: "supervisor_001",
      dueAt: dueInDays(1),
    });
  }

  const serviceRequestObservations = bundle.visit.observations.filter((observation) =>
    /book|booking|appointment|next session|service request|ndis/.test(observationText(observation)),
  );
  if (serviceRequestObservations.length) {
    recommendations.push({
      visitId: bundle.visit.id,
      actorId: "system",
      actorRole: "admin",
      actionType: "service_booking",
      priority: "low",
      title: "Review service booking request",
      recommendationReason: "The client raised a booking or service request for office confirmation.",
      sourceObservationIds: serviceRequestObservations.map((observation) => observation.id),
      assignedTo: "supervisor_001",
      dueAt: dueInDays(3),
    });
  }

  return recommendations;
}

export async function createFollowUpTask(input: FollowUpTaskInput) {
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  const actionType = FollowUpActionTypeSchema.parse(input.actionType);
  const priority = FollowUpTaskPrioritySchema.parse(input.priority);
  const status = FollowUpTaskStatusSchema.parse(input.status ?? "recommended");
  const prisma = getPrisma();
  const row = await prisma.followUpTask.create({
    data: {
      id: `follow_${randomUUID()}`,
      visitId: input.visitId,
      escalationId: bundle.visit.escalation.id,
      actionType,
      priority,
      status,
      title: input.title,
      recommendationReason: input.recommendationReason,
      sourceObservationIdsJson: json(input.sourceObservationIds ?? []),
      assignedTo: input.assignedTo ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: input.status === "recommended" || !input.status ? "FOLLOW_UP_RECOMMENDED" : "FOLLOW_UP_CREATED",
    summary: `${actionType} follow-up created: ${input.title}`,
    safetyFlags: ["supervisor_triage", "non_clinical_workflow_only"],
  });
  return mapFollowUpTask(row);
}

export async function createRecommendedFollowUps(input: { visitId: string; actorId: string; actorRole: Role }) {
  await refreshEscalation(input.visitId, input.actorId, input.actorRole);
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");
  const existing = bundle.followUpTasks.filter((task) => task.status !== "dismissed");
  const created: FollowUpTask[] = [];
  for (const recommendation of recommendedFollowUps(bundle)) {
    const duplicate = existing.some((task) => task.actionType === recommendation.actionType);
    if (duplicate) continue;
    created.push(
      await createFollowUpTask({
        ...recommendation,
        actorId: input.actorId,
        actorRole: input.actorRole,
      }),
    );
  }
  return created;
}

export async function updateFollowUpTask(input: {
  taskId: string;
  actorId: string;
  actorRole: Role;
  status?: FollowUpTaskStatus;
  priority?: FollowUpTaskPriority;
  title?: string;
  recommendationReason?: string;
  assignedTo?: string | null;
  dueAt?: string | null;
}) {
  const prisma = getPrisma();
  const existing = await prisma.followUpTask.findUniqueOrThrow({ where: { id: input.taskId } });
  const row = await prisma.followUpTask.update({
    where: { id: input.taskId },
    data: {
      status: input.status ? FollowUpTaskStatusSchema.parse(input.status) : undefined,
      priority: input.priority ? FollowUpTaskPrioritySchema.parse(input.priority) : undefined,
      title: input.title?.trim() || undefined,
      recommendationReason: input.recommendationReason?.trim() || undefined,
      assignedTo: input.assignedTo === undefined ? undefined : input.assignedTo,
      dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  const bundle = await getVisitBundle(existing.visitId);
  if (input.status === "accepted" || input.status === "assigned") {
    await prisma.escalation.update({
      where: { visitId: existing.visitId },
      data: { status: "assigned", assignedTo: input.assignedTo ?? row.assignedTo ?? "supervisor_001" },
    });
  }
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: existing.visitId,
    clientId: bundle?.client.id ?? null,
    eventType: "FOLLOW_UP_UPDATED",
    summary: `${row.actionType} follow-up updated to ${row.status}.`,
    safetyFlags: ["supervisor_triage"],
  });
  return mapFollowUpTask(row);
}

export async function submitVisitReport(input: { visitId: string; actorId: string; actorRole: Role }) {
  if (input.actorRole !== "worker") throw new Error("Only the worker can submit the visit report.");
  await seedVisitChecklist(input.visitId);
  const bundle = await getVisitBundle(input.visitId);
  if (!bundle) throw new Error("Visit not found.");

  await createRecommendedFollowUps(input);
  const prisma = getPrisma();
  await prisma.visitSession.update({
    where: { id: input.visitId },
    data: { status: "submitted", actualEnd: bundle.visit.actualEnd ? new Date(bundle.visit.actualEnd) : now() },
  });
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    clientId: bundle.client.id,
    eventType: "VISIT_SUBMITTED",
    summary: "Worker submitted report to supervisor queue.",
    safetyFlags: ["supervisor_review_required", "artifact_storage_no_raw_video"],
  });
  return getVisitBundle(input.visitId);
}

export async function createRemoteCheckIn(input: { visitId: string; actorId: string; actorRole: Role }) {
  const task = await createFollowUpTask({
    visitId: input.visitId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: "phone_call",
    priority: "medium",
    status: "accepted",
    title: "Call Grace to confirm hallway rug secured before next visit.",
    recommendationReason: "Backwards-compatible remote check-in action.",
    sourceObservationIds: [],
    assignedTo: "supervisor_001",
    dueAt: dueInDays(1),
  });
  await addAuditEvent({
    actorId: input.actorId,
    actorRole: input.actorRole,
    visitId: input.visitId,
    eventType: "REMOTE_CHECKIN_CREATED",
    summary: "Remote check-in created through the follow-up task queue.",
    safetyFlags: ["backwards_compatible_route"],
  });
  return task;
}

export async function resetDemoData() {
  const prisma = getPrisma();
  getLiveRayBanFrameBuffer().clear(maggieVisit.id);
  await prisma.auditEvent.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.outputDocument.deleteMany();
  await prisma.redactionEvent.deleteMany();
  await prisma.liveRayBanEvent.deleteMany();
  await prisma.visitChecklistItem.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.consentEvent.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.visitSession.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({ data: demoUsers });
  await prisma.clientProfile.create({
    data: {
      id: maggieClient.id,
      displayName: maggieClient.displayName,
      preferredName: maggieClient.preferredName,
      dateOfBirth: maggieClient.dateOfBirth,
      addressJson: json(maggieClient.address),
      authorisedFamilyContactsJson: json(maggieClient.authorisedFamilyContacts),
      carePlanSummary: maggieClient.carePlanSummary,
      knownRisksJson: json(maggieClient.knownRisks),
      communicationPreferencesJson: json(maggieClient.communicationPreferences),
      privacyNotes: maggieClient.privacyNotes,
      createdAt: new Date(maggieClient.createdAt),
      updatedAt: new Date(maggieClient.updatedAt),
    },
  });
  await prisma.visitSession.create({
    data: {
      id: maggieVisit.id,
      clientId: maggieVisit.clientId,
      workerId: maggieVisit.workerId,
      scheduledStart: new Date(maggieVisit.scheduledStart),
      scheduledEnd: new Date(maggieVisit.scheduledEnd),
      actualStart: null,
      actualEnd: null,
      status: maggieVisit.status,
      captureModesUsedJson: json(maggieVisit.captureModesUsed),
      preVisitBriefJson: json(maggieVisit.preVisitBrief),
      humanSignoffJson: json(maggieVisit.humanSignoff),
      createdAt: new Date(maggieVisit.createdAt),
      updatedAt: new Date(maggieVisit.updatedAt),
    },
  });
  await seedVisitChecklist(maggieVisit.id);
  await prisma.escalation.create({
    data: {
      id: maggieVisit.escalation.id,
      visitId: maggieVisit.id,
      riskLevel: maggieVisit.escalation.riskLevel,
      status: maggieVisit.escalation.status,
      reason: maggieVisit.escalation.reason,
      recommendedAction: maggieVisit.escalation.recommendedAction,
      assignedTo: null,
      createdAt: new Date(maggieVisit.escalation.createdAt),
      updatedAt: new Date(maggieVisit.escalation.updatedAt),
    },
  });
  for (const event of initialAuditEvents) {
    await prisma.auditEvent.create({
      data: {
        id: event.id,
        actorId: event.actorId,
        actorRole: event.actorRole,
        visitId: event.visitId,
        clientId: event.clientId,
        eventType: event.eventType,
        summary: event.summary,
        safetyFlagsJson: json(event.safetyFlags),
        createdAt: new Date(event.createdAt),
      },
    });
  }
}
