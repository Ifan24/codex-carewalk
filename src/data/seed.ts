import {
  AuditEventSchema,
  ClientProfileSchema,
  DemoUserSchema,
  VisitSessionSchema,
  type AuditEvent,
  type ClientProfile,
  type DemoUser,
  type VisitSession,
} from "@/lib/schemas";

const now = "2026-04-29T09:00:00.000Z";

export const demoUsers = [
  {
    id: "worker_001",
    email: "worker@carewalk.local",
    password: "carewalk",
    role: "worker",
    displayName: "Alex Worker",
    navigationPreference: "apple_maps",
  },
  {
    id: "supervisor_001",
    email: "supervisor@carewalk.local",
    password: "carewalk",
    role: "supervisor",
    displayName: "Sam Supervisor",
    navigationPreference: "apple_maps",
  },
  {
    id: "family_001",
    email: "family@carewalk.local",
    password: "carewalk",
    role: "family",
    displayName: "Grace Liu",
    navigationPreference: "apple_maps",
  },
  {
    id: "admin_001",
    email: "admin@carewalk.local",
    password: "carewalk",
    role: "admin",
    displayName: "CareWalk Admin",
    navigationPreference: "apple_maps",
  },
].map((user) => DemoUserSchema.parse(user)) satisfies DemoUser[];

export const maggieClient = ClientProfileSchema.parse({
  id: "client_001",
  displayName: "Margaret Liu",
  preferredName: "Maggie",
  dateOfBirth: "1941-08-12",
  address: {
    line1: "14 River Street",
    suburb: "Parramatta",
    state: "NSW",
    postcode: "2150",
    country: "Australia",
  },
  authorisedFamilyContacts: [
    {
      id: "family_001",
      name: "Grace Liu",
      relationship: "daughter",
      email: "family@carewalk.local",
      canReceiveSummaries: true,
    },
  ],
  carePlanSummary:
    "Domestic assistance and wellbeing check twice weekly. Worker should use plain language and confirm understanding.",
  knownRisks: ["falls risk", "social isolation", "recent dizziness reported to provider"],
  communicationPreferences: ["prefers being called Maggie", "does not like rushed conversations"],
  privacyNotes:
    "No recording in bedroom or bathroom. Family summary approved for general wellbeing and follow-up only.",
  createdAt: now,
  updatedAt: now,
}) satisfies ClientProfile;

export const maggieVisit = VisitSessionSchema.parse({
  id: "visit_001",
  clientId: "client_001",
  workerId: "worker_001",
  scheduledStart: "2026-04-29T10:00:00.000Z",
  scheduledEnd: "2026-04-29T10:45:00.000Z",
  actualStart: null,
  actualEnd: null,
  status: "scheduled",
  captureModesUsed: [],
  preVisitBrief: {
    knownRisks: ["falls risk", "recent dizziness reported", "social isolation"],
    lastUnresolvedActions: ["Confirm hallway rug was moved or secured"],
    todayFocus: ["General wellbeing", "Meals visible", "Trip hazards", "Worker Glasses evidence if consented"],
    workerReminder:
      "Use Worker Glasses only after consent. No recording in bedroom or bathroom.",
  },
  observations: [],
  consentEvents: [],
  checklistItems: [],
  mediaAssets: [],
  redactionEvents: [],
  escalation: {
    id: "esc_001",
    visitId: "visit_001",
    riskLevel: "none",
    status: "none",
    reason: "No escalation created yet.",
    recommendedAction: "Capture observations before routing follow-up.",
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  },
  outputs: [],
  humanSignoff: {
    required: true,
    signedOffBy: null,
    signedOffAt: null,
    notes: "Worker must review generated outputs before final record.",
  },
  createdAt: "2026-04-29T09:45:00.000Z",
  updatedAt: "2026-04-29T09:45:00.000Z",
}) satisfies VisitSession;

export const initialAuditEvents = [
  {
    id: "audit_seed_001",
    actorId: "admin_001",
    actorRole: "admin",
    visitId: "visit_001",
    clientId: "client_001",
    eventType: "DEMO_RESET",
    summary: "Visit data reset for the Worker Glasses CareWalk flow.",
    safetyFlags: ["demo_mode", "human_signoff_required"],
    createdAt: now,
  },
].map((event) => AuditEventSchema.parse(event)) satisfies AuditEvent[];

export const demoRawNote =
  "Maggie seemed settled today. Meals visible in fridge. Loose rug near hallway. She mentioned dizziness yesterday but no current distress. Medication box was present but I did not assess medication use.";
