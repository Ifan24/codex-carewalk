import { z } from "zod";

export const ObservationStatusSchema = z.enum(["observed", "not_observed", "unknown"]);
export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export const RiskLevelSchema = z.enum(["none", "low", "medium", "high", "urgent"]);
export const NavigationPreferenceSchema = z.enum(["apple_maps", "google_maps", "waze"]);
export const CaptureModeSchema = z.enum([
  "manual_checklist",
  "text_note",
  "voice_transcript",
  "phone_photo",
  "rayban_media_upload",
  "rayban_live_assist",
  "remote_checkin",
]);
export const RoleSchema = z.enum(["worker", "supervisor", "family", "admin"]);
export const ConsentStateSchema = z.enum(["granted", "declined", "not_requested", "withdrawn"]);
export const RedactionStatusSchema = z.enum(["not_required", "pending", "applied", "failed"]);
export const OutputTypeSchema = z.enum(["worker_note", "provider_compliance_log", "family_summary"]);
export const EscalationStatusSchema = z.enum(["none", "draft", "open", "assigned", "resolved", "closed"]);
export const ChecklistItemStatusSchema = z.enum(["pending", "active", "done", "skipped", "concern"]);
export const ChecklistItemCategorySchema = z.enum([
  "wellbeing",
  "nutrition",
  "falls_hazard",
  "medication_supply",
  "service_request",
  "close_out",
]);
export const FollowUpActionTypeSchema = z.enum([
  "phone_call",
  "medication_supply_followup",
  "home_hazard",
  "clinical_review",
  "family_update",
  "service_booking",
]);
export const FollowUpTaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const FollowUpTaskStatusSchema = z.enum(["recommended", "accepted", "assigned", "completed", "dismissed"]);
export const ObservationCategorySchema = z.enum([
  "wellbeing",
  "mobility",
  "falls_hazard",
  "nutrition",
  "medication_related_observation",
  "home_environment",
  "hygiene",
  "social_connection",
  "access",
  "service_delivery",
  "other",
]);
export const ConsentScopeSchema = z.enum([
  "manual_notes",
  "voice_note",
  "phone_photo",
  "rayban_media",
  "family_summary",
]);
export const EvidenceTypeSchema = z.enum([
  "none",
  "manual",
  "text",
  "voice_transcript",
  "photo",
  "video",
  "rayban_media",
  "rayban_live_summary",
]);
export const MediaSourceSchema = z.enum(["rayban_meta", "phone_camera_fallback"]);
export const CaptureContextSchema = z.enum([
  "entryway",
  "hallway",
  "kitchen",
  "general_living_area",
  "bathroom_exterior",
  "other",
  "bedroom",
  "bathroom_interior",
  "toileting",
  "changing_area",
  "personal_care",
]);
export const RedactionTypeSchema = z.enum([
  "face_blur",
  "license_plate_blur",
  "document_text_mask",
  "background_person_blur",
  "none",
]);
export const OutputStatusSchema = z.enum(["draft", "needs_review", "approved", "rejected"]);
export const VisitStatusSchema = z.enum(["scheduled", "in_progress", "review", "signed_off", "submitted", "cancelled"]);

export const AddressSchema = z
  .object({
    line1: z.string(),
    suburb: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
  })
  .strict();

export const FamilyContactSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    relationship: z.string(),
    email: z.string().email(),
    canReceiveSummaries: z.boolean(),
  })
  .strict();

export const ClientProfileSchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    preferredName: z.string(),
    dateOfBirth: z.string(),
    address: AddressSchema,
    authorisedFamilyContacts: z.array(FamilyContactSchema),
    carePlanSummary: z.string(),
    knownRisks: z.array(z.string()),
    communicationPreferences: z.array(z.string()),
    privacyNotes: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const EvidenceSchema = z
  .object({
    type: EvidenceTypeSchema,
    uri: z.string().nullable(),
    summary: z.string(),
    redactionStatus: RedactionStatusSchema,
  })
  .strict();

export const ObservationSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    category: ObservationCategorySchema,
    label: z.string(),
    status: ObservationStatusSchema,
    description: z.string(),
    evidence: EvidenceSchema,
    confidence: ConfidenceSchema,
    capturedBy: z.string(),
    captureMode: CaptureModeSchema,
    capturedAt: z.string(),
    isSensitive: z.boolean(),
    requiresHumanReview: z.boolean(),
    unknownReason: z.string().nullable(),
  })
  .strict();

export const ConsentEventSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    clientId: z.string(),
    actorId: z.string(),
    consentState: ConsentStateSchema,
    scope: z.array(ConsentScopeSchema),
    captureModesAllowed: z.array(CaptureModeSchema),
    notes: z.string(),
    recordedAt: z.string(),
  })
  .strict();

export const MediaAssetSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    source: MediaSourceSchema,
    captureContext: CaptureContextSchema,
    consentEventId: z.string().nullable(),
    redactionStatus: RedactionStatusSchema,
    fileName: z.string(),
    mimeType: z.string(),
    previewDataUrl: z.string(),
    linkedObservationIds: z.array(z.string()),
    workerReviewed: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const RedactionEventSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    mediaId: z.string(),
    status: RedactionStatusSchema,
    redactionTypes: z.array(RedactionTypeSchema),
    notes: z.string(),
    processedBy: z.string(),
    processedAt: z.string(),
  })
  .strict();

export const EscalationSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    riskLevel: RiskLevelSchema,
    status: EscalationStatusSchema,
    reason: z.string(),
    recommendedAction: z.string(),
    assignedTo: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const OutputDocumentSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    type: OutputTypeSchema,
    status: OutputStatusSchema,
    title: z.string(),
    body: z.string(),
    safetyFlags: z.array(z.string()),
    evidenceObservationIds: z.array(z.string()),
    generatedAt: z.string(),
    generatedBy: z.string(),
    approvedBy: z.string().nullable(),
    approvedAt: z.string().nullable(),
  })
  .strict();

export const HumanSignoffSchema = z
  .object({
    required: z.boolean(),
    signedOffBy: z.string().nullable(),
    signedOffAt: z.string().nullable(),
    notes: z.string(),
  })
  .strict();

export const PreVisitBriefSchema = z
  .object({
    knownRisks: z.array(z.string()),
    lastUnresolvedActions: z.array(z.string()),
    todayFocus: z.array(z.string()),
    workerReminder: z.string(),
  })
  .strict();

export const VisitChecklistItemSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    sequence: z.number().int().nonnegative(),
    prompt: z.string(),
    category: ChecklistItemCategorySchema,
    status: ChecklistItemStatusSchema,
    evidenceTranscript: z.string().nullable(),
    linkedObservationId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .strict();

export const VisitSessionSchema = z
  .object({
    id: z.string(),
    clientId: z.string(),
    workerId: z.string(),
    scheduledStart: z.string(),
    scheduledEnd: z.string(),
    actualStart: z.string().nullable(),
    actualEnd: z.string().nullable(),
    status: VisitStatusSchema,
    captureModesUsed: z.array(CaptureModeSchema),
    preVisitBrief: PreVisitBriefSchema,
    observations: z.array(ObservationSchema),
    consentEvents: z.array(ConsentEventSchema),
    checklistItems: z.array(VisitChecklistItemSchema),
    mediaAssets: z.array(MediaAssetSchema),
    redactionEvents: z.array(RedactionEventSchema),
    escalation: EscalationSchema,
    outputs: z.array(OutputDocumentSchema),
    humanSignoff: HumanSignoffSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const AuditEventTypeSchema = z.enum([
  "LOGIN",
  "VISIT_STARTED",
  "CONSENT_RECORDED",
  "CAPTURE_MODE_SELECTED",
  "LIVE_RAYBAN_SESSION_STARTED",
  "LIVE_RAYBAN_EVENT_RECEIVED",
  "CHECKLIST_PROMPTED",
  "CHECKLIST_ITEM_UPDATED",
  "CHECKLIST_VOICE_COMMAND",
  "LIVE_RAYBAN_QUESTION_ANSWERED",
  "LIVE_RAYBAN_SESSION_ENDED",
  "OBSERVATION_CREATED",
  "MEDIA_UPLOADED",
  "REDACTION_APPLIED",
  "AI_GENERATION_REQUESTED",
  "AI_GENERATION_COMPLETED",
  "SAFE_MODE_TRIGGERED",
  "OUTPUT_EDITED",
  "OUTPUT_APPROVED",
  "OUTPUT_APPROVAL_UNDONE",
  "ESCALATION_CREATED",
  "ESCALATION_UPDATED",
  "VISIT_SUBMITTED",
  "FOLLOW_UP_RECOMMENDED",
  "FOLLOW_UP_CREATED",
  "FOLLOW_UP_UPDATED",
  "FAMILY_SUMMARY_APPROVED",
  "VISIT_SIGNED_OFF",
  "REMOTE_CHECKIN_CREATED",
  "DEMO_RESET",
]);

export const AuditEventSchema = z
  .object({
    id: z.string(),
    actorId: z.string(),
    actorRole: RoleSchema,
    visitId: z.string().nullable(),
    clientId: z.string().nullable(),
    eventType: AuditEventTypeSchema,
    summary: z.string(),
    safetyFlags: z.array(z.string()),
    createdAt: z.string(),
  })
  .strict();

export const LiveRayBanEventTypeSchema = z.enum([
  "session_started",
  "transcript_chunk",
  "hazard_candidate",
  "question_answer",
  "checklist_prompt",
  "checklist_response",
  "session_ended",
]);

export const LiveRayBanEventSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    actorId: z.string(),
    actorRole: RoleSchema,
    eventType: LiveRayBanEventTypeSchema,
    payload: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
  })
  .strict();

export const LiveRayBanFrameSchema = z
  .object({
    visitId: z.string(),
    frameId: z.string(),
    sessionToken: z.string(),
    captureContext: CaptureContextSchema,
    mimeType: z.literal("image/jpeg"),
    dataUrl: z.string().startsWith("data:image/jpeg;base64,"),
    sentAt: z.string(),
    receivedAt: z.string(),
  })
  .strict();

export const FollowUpTaskSchema = z
  .object({
    id: z.string(),
    visitId: z.string(),
    escalationId: z.string().nullable(),
    actionType: FollowUpActionTypeSchema,
    priority: FollowUpTaskPrioritySchema,
    status: FollowUpTaskStatusSchema,
    title: z.string(),
    recommendationReason: z.string(),
    sourceObservationIds: z.array(z.string()),
    assignedTo: z.string().nullable(),
    dueAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const DemoUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    password: z.string(),
    role: RoleSchema,
    displayName: z.string(),
    navigationPreference: NavigationPreferenceSchema.default("apple_maps"),
  })
  .strict();

export const VisitBundleSchema = z
  .object({
    visit: VisitSessionSchema,
    client: ClientProfileSchema,
    auditEvents: z.array(AuditEventSchema),
    followUpTasks: z.array(FollowUpTaskSchema),
  })
  .strict();

export type ObservationStatus = z.infer<typeof ObservationStatusSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type NavigationPreference = z.infer<typeof NavigationPreferenceSchema>;
export type CaptureMode = z.infer<typeof CaptureModeSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type ConsentState = z.infer<typeof ConsentStateSchema>;
export type RedactionStatus = z.infer<typeof RedactionStatusSchema>;
export type OutputType = z.infer<typeof OutputTypeSchema>;
export type EscalationStatus = z.infer<typeof EscalationStatusSchema>;
export type ChecklistItemStatus = z.infer<typeof ChecklistItemStatusSchema>;
export type ChecklistItemCategory = z.infer<typeof ChecklistItemCategorySchema>;
export type FollowUpActionType = z.infer<typeof FollowUpActionTypeSchema>;
export type FollowUpTaskPriority = z.infer<typeof FollowUpTaskPrioritySchema>;
export type FollowUpTaskStatus = z.infer<typeof FollowUpTaskStatusSchema>;
export type ClientProfile = z.infer<typeof ClientProfileSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type ConsentEvent = z.infer<typeof ConsentEventSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type RedactionEvent = z.infer<typeof RedactionEventSchema>;
export type Escalation = z.infer<typeof EscalationSchema>;
export type OutputDocument = z.infer<typeof OutputDocumentSchema>;
export type VisitSession = z.infer<typeof VisitSessionSchema>;
export type VisitChecklistItem = z.infer<typeof VisitChecklistItemSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type LiveRayBanEvent = z.infer<typeof LiveRayBanEventSchema>;
export type LiveRayBanEventType = z.infer<typeof LiveRayBanEventTypeSchema>;
export type LiveRayBanFrame = z.infer<typeof LiveRayBanFrameSchema>;
export type FollowUpTask = z.infer<typeof FollowUpTaskSchema>;
export type DemoUser = z.infer<typeof DemoUserSchema>;
export type VisitBundle = z.infer<typeof VisitBundleSchema>;

export const PRIVATE_CAPTURE_CONTEXTS = [
  "bedroom",
  "bathroom_interior",
  "toileting",
  "changing_area",
  "personal_care",
] as const;

export function isPrivateCaptureContext(context: string) {
  return PRIVATE_CAPTURE_CONTEXTS.includes(context as (typeof PRIVATE_CAPTURE_CONTEXTS)[number]);
}
