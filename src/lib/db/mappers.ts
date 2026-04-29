import type {
  AuditEvent,
  ClientProfile,
  ConsentEvent,
  Escalation,
  FollowUpTask,
  LiveRayBanEvent,
  MediaAsset,
  Observation,
  OutputDocument,
  RedactionEvent,
  VisitChecklistItem,
  VisitBundle,
  VisitSession,
} from "@/lib/schemas";
import {
  AuditEventSchema,
  ClientProfileSchema,
  ConsentEventSchema,
  EscalationSchema,
  FollowUpTaskSchema,
  LiveRayBanEventSchema,
  MediaAssetSchema,
  ObservationSchema,
  OutputDocumentSchema,
  RedactionEventSchema,
  VisitChecklistItemSchema,
  VisitBundleSchema,
  VisitSessionSchema,
} from "@/lib/schemas";

type JsonValue = string | null;

function parseJson<T>(value: JsonValue, fallback: T): T {
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

function iso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function mapClient(row: {
  id: string;
  displayName: string;
  preferredName: string;
  dateOfBirth: string;
  addressJson: string;
  authorisedFamilyContactsJson: string;
  carePlanSummary: string;
  knownRisksJson: string;
  communicationPreferencesJson: string;
  privacyNotes: string;
  createdAt: Date;
  updatedAt: Date;
}): ClientProfile {
  return ClientProfileSchema.parse({
    id: row.id,
    displayName: row.displayName,
    preferredName: row.preferredName,
    dateOfBirth: row.dateOfBirth,
    address: parseJson(row.addressJson, {}),
    authorisedFamilyContacts: parseJson(row.authorisedFamilyContactsJson, []),
    carePlanSummary: row.carePlanSummary,
    knownRisks: parseJson(row.knownRisksJson, []),
    communicationPreferences: parseJson(row.communicationPreferencesJson, []),
    privacyNotes: row.privacyNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapObservation(row: {
  id: string;
  visitId: string;
  category: string;
  label: string;
  status: string;
  description: string;
  evidenceJson: string;
  confidence: string;
  capturedBy: string;
  captureMode: string;
  capturedAt: Date;
  isSensitive: boolean;
  requiresHumanReview: boolean;
  unknownReason: string | null;
}): Observation {
  return ObservationSchema.parse({
    id: row.id,
    visitId: row.visitId,
    category: row.category,
    label: row.label,
    status: row.status,
    description: row.description,
    evidence: parseJson(row.evidenceJson, {}),
    confidence: row.confidence,
    capturedBy: row.capturedBy,
    captureMode: row.captureMode,
    capturedAt: row.capturedAt.toISOString(),
    isSensitive: row.isSensitive,
    requiresHumanReview: row.requiresHumanReview,
    unknownReason: row.unknownReason,
  });
}

export function mapConsent(row: {
  id: string;
  visitId: string;
  clientId: string;
  actorId: string;
  consentState: string;
  scopeJson: string;
  captureModesAllowedJson: string;
  notes: string;
  recordedAt: Date;
}): ConsentEvent {
  return ConsentEventSchema.parse({
    id: row.id,
    visitId: row.visitId,
    clientId: row.clientId,
    actorId: row.actorId,
    consentState: row.consentState,
    scope: parseJson(row.scopeJson, []),
    captureModesAllowed: parseJson(row.captureModesAllowedJson, []),
    notes: row.notes,
    recordedAt: row.recordedAt.toISOString(),
  });
}

export function mapMedia(row: {
  id: string;
  visitId: string;
  source: string;
  captureContext: string;
  consentEventId: string | null;
  redactionStatus: string;
  fileName: string;
  mimeType: string;
  previewDataUrl: string;
  linkedObservationIdsJson: string;
  workerReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MediaAsset {
  return MediaAssetSchema.parse({
    id: row.id,
    visitId: row.visitId,
    source: row.source,
    captureContext: row.captureContext,
    consentEventId: row.consentEventId,
    redactionStatus: row.redactionStatus,
    fileName: row.fileName,
    mimeType: row.mimeType,
    previewDataUrl: row.previewDataUrl,
    linkedObservationIds: parseJson(row.linkedObservationIdsJson, []),
    workerReviewed: row.workerReviewed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapLiveRayBanEvent(row: {
  id: string;
  visitId: string;
  actorId: string;
  actorRole: string;
  eventType: string;
  payloadJson: string;
  createdAt: Date;
}): LiveRayBanEvent {
  return LiveRayBanEventSchema.parse({
    id: row.id,
    visitId: row.visitId,
    actorId: row.actorId,
    actorRole: row.actorRole,
    eventType: row.eventType,
    payload: parseJson(row.payloadJson, {}),
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapVisitChecklistItem(row: {
  id: string;
  visitId: string;
  sequence: number;
  prompt: string;
  category: string;
  status: string;
  evidenceTranscript: string | null;
  linkedObservationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): VisitChecklistItem {
  return VisitChecklistItemSchema.parse({
    id: row.id,
    visitId: row.visitId,
    sequence: row.sequence,
    prompt: row.prompt,
    category: row.category,
    status: row.status,
    evidenceTranscript: row.evidenceTranscript,
    linkedObservationId: row.linkedObservationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: iso(row.completedAt),
  });
}

export function mapRedaction(row: {
  id: string;
  visitId: string;
  mediaId: string;
  status: string;
  redactionTypesJson: string;
  notes: string;
  processedBy: string;
  processedAt: Date;
}): RedactionEvent {
  return RedactionEventSchema.parse({
    id: row.id,
    visitId: row.visitId,
    mediaId: row.mediaId,
    status: row.status,
    redactionTypes: parseJson(row.redactionTypesJson, []),
    notes: row.notes,
    processedBy: row.processedBy,
    processedAt: row.processedAt.toISOString(),
  });
}

export function mapEscalation(row: {
  id: string;
  visitId: string;
  riskLevel: string;
  status: string;
  reason: string;
  recommendedAction: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Escalation {
  return EscalationSchema.parse({
    id: row.id,
    visitId: row.visitId,
    riskLevel: row.riskLevel,
    status: row.status,
    reason: row.reason,
    recommendedAction: row.recommendedAction,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapOutput(row: {
  id: string;
  visitId: string;
  type: string;
  status: string;
  title: string;
  body: string;
  safetyFlagsJson: string;
  evidenceObservationIdsJson: string;
  generatedAt: Date;
  generatedBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
}): OutputDocument {
  return OutputDocumentSchema.parse({
    id: row.id,
    visitId: row.visitId,
    type: row.type,
    status: row.status,
    title: row.title,
    body: row.body,
    safetyFlags: parseJson(row.safetyFlagsJson, []),
    evidenceObservationIds: parseJson(row.evidenceObservationIdsJson, []),
    generatedAt: row.generatedAt.toISOString(),
    generatedBy: row.generatedBy,
    approvedBy: row.approvedBy,
    approvedAt: iso(row.approvedAt),
  });
}

export function mapAudit(row: {
  id: string;
  actorId: string;
  actorRole: string;
  visitId: string | null;
  clientId: string | null;
  eventType: string;
  summary: string;
  safetyFlagsJson: string;
  createdAt: Date;
}): AuditEvent {
  return AuditEventSchema.parse({
    id: row.id,
    actorId: row.actorId,
    actorRole: row.actorRole,
    visitId: row.visitId,
    clientId: row.clientId,
    eventType: row.eventType,
    summary: row.summary,
    safetyFlags: parseJson(row.safetyFlagsJson, []),
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapFollowUpTask(row: {
  id: string;
  visitId: string;
  escalationId: string | null;
  actionType: string;
  priority: string;
  status: string;
  title: string;
  recommendationReason: string;
  sourceObservationIdsJson: string;
  assignedTo: string | null;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FollowUpTask {
  return FollowUpTaskSchema.parse({
    id: row.id,
    visitId: row.visitId,
    escalationId: row.escalationId,
    actionType: row.actionType,
    priority: row.priority,
    status: row.status,
    title: row.title,
    recommendationReason: row.recommendationReason,
    sourceObservationIds: parseJson(row.sourceObservationIdsJson, []),
    assignedTo: row.assignedTo,
    dueAt: iso(row.dueAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapVisit(row: {
  id: string;
  clientId: string;
  workerId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  status: string;
  captureModesUsedJson: string;
  preVisitBriefJson: string;
  humanSignoffJson: string;
  createdAt: Date;
  updatedAt: Date;
  observations: Parameters<typeof mapObservation>[0][];
  consentEvents: Parameters<typeof mapConsent>[0][];
  checklistItems: Parameters<typeof mapVisitChecklistItem>[0][];
  mediaAssets: Parameters<typeof mapMedia>[0][];
  redactionEvents: Parameters<typeof mapRedaction>[0][];
  escalation: Parameters<typeof mapEscalation>[0] | null;
  outputs: Parameters<typeof mapOutput>[0][];
}): VisitSession {
  return VisitSessionSchema.parse({
    id: row.id,
    clientId: row.clientId,
    workerId: row.workerId,
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    actualStart: iso(row.actualStart),
    actualEnd: iso(row.actualEnd),
    status: row.status,
    captureModesUsed: parseJson(row.captureModesUsedJson, []),
    preVisitBrief: parseJson(row.preVisitBriefJson, {}),
    observations: row.observations.map(mapObservation),
    consentEvents: row.consentEvents.map(mapConsent),
    checklistItems: row.checklistItems.map(mapVisitChecklistItem),
    mediaAssets: row.mediaAssets.map(mapMedia),
    redactionEvents: row.redactionEvents.map(mapRedaction),
    escalation: row.escalation
      ? mapEscalation(row.escalation)
      : {
          id: "esc_none",
          visitId: row.id,
          riskLevel: "none",
          status: "none",
          reason: "No escalation created.",
          recommendedAction: "No supervisor action required.",
          assignedTo: null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
    outputs: row.outputs.map(mapOutput),
    humanSignoff: parseJson(row.humanSignoffJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapVisitBundle(bundle: {
  visit: Parameters<typeof mapVisit>[0];
  client: Parameters<typeof mapClient>[0];
  auditEvents: Parameters<typeof mapAudit>[0][];
  followUpTasks: Parameters<typeof mapFollowUpTask>[0][];
}): VisitBundle {
  return VisitBundleSchema.parse({
    visit: mapVisit(bundle.visit),
    client: mapClient(bundle.client),
    auditEvents: bundle.auditEvents.map(mapAudit),
    followUpTasks: bundle.followUpTasks.map(mapFollowUpTask),
  });
}
