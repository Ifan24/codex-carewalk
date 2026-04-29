import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const now = new Date("2026-04-29T09:00:00.000Z");

const users = [
  { id: "worker_001", email: "worker@carewalk.local", password: "carewalk", role: "worker", displayName: "Alex Worker", navigationPreference: "apple_maps" },
  { id: "supervisor_001", email: "supervisor@carewalk.local", password: "carewalk", role: "supervisor", displayName: "Sam Supervisor", navigationPreference: "apple_maps" },
  { id: "family_001", email: "family@carewalk.local", password: "carewalk", role: "family", displayName: "Grace Liu", navigationPreference: "apple_maps" },
  { id: "admin_001", email: "admin@carewalk.local", password: "carewalk", role: "admin", displayName: "CareWalk Admin", navigationPreference: "apple_maps" },
];

const client = {
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
  carePlanSummary: "Domestic assistance and wellbeing check twice weekly. Worker should use plain language and confirm understanding.",
  knownRisks: ["falls risk", "social isolation", "recent dizziness reported to provider"],
  communicationPreferences: ["prefers being called Maggie", "does not like rushed conversations"],
  privacyNotes: "No recording in bedroom or bathroom. Family summary approved for general wellbeing and follow-up only.",
};

const preVisitBrief = {
  knownRisks: ["falls risk", "recent dizziness reported", "social isolation"],
  lastUnresolvedActions: ["Confirm hallway rug was moved or secured"],
  todayFocus: ["General wellbeing", "Meals visible", "Trip hazards", "Worker Glasses evidence if consented"],
  workerReminder:
    "Use Worker Glasses only after consent. No recording in bedroom or bathroom.",
};

const checklistItems = [
  ["check_001", 1, "wellbeing", "Ask how Maggie is feeling today and listen for any reported changes such as dizziness.", "active"],
  ["check_002", 2, "nutrition", "Check that meals or food are visible and note any concern about food availability.", "pending"],
  ["check_003", 3, "falls_hazard", "Scan the entry and hallway walking path for curled rugs, cords, clutter, spills, or low lighting.", "pending"],
  ["check_004", 4, "medication_supply", "Check whether medication supply appears enough until the next visit. Do not advise dose or changes.", "pending"],
  ["check_005", 5, "service_request", "Ask whether Maggie has service requests, booking questions, or anything the office should follow up.", "pending"],
  ["check_006", 6, "close_out", "Close the visit by confirming what will be reported and whether any follow-up is needed.", "pending"],
];

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.outputDocument.deleteMany();
  await prisma.redactionEvent.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.consentEvent.deleteMany();
  await prisma.visitChecklistItem.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.visitSession.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({ data: users });
  await prisma.clientProfile.create({
    data: {
      id: client.id,
      displayName: client.displayName,
      preferredName: client.preferredName,
      dateOfBirth: client.dateOfBirth,
      addressJson: JSON.stringify(client.address),
      authorisedFamilyContactsJson: JSON.stringify(client.authorisedFamilyContacts),
      carePlanSummary: client.carePlanSummary,
      knownRisksJson: JSON.stringify(client.knownRisks),
      communicationPreferencesJson: JSON.stringify(client.communicationPreferences),
      privacyNotes: client.privacyNotes,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.visitSession.create({
    data: {
      id: "visit_001",
      clientId: "client_001",
      workerId: "worker_001",
      scheduledStart: new Date("2026-04-29T10:00:00.000Z"),
      scheduledEnd: new Date("2026-04-29T10:45:00.000Z"),
      actualStart: null,
      actualEnd: null,
      status: "scheduled",
      captureModesUsedJson: JSON.stringify([]),
      preVisitBriefJson: JSON.stringify(preVisitBrief),
      humanSignoffJson: JSON.stringify({
        required: true,
        signedOffBy: null,
        signedOffAt: null,
        notes: "Worker must review generated outputs before final record.",
      }),
      createdAt: new Date("2026-04-29T09:45:00.000Z"),
      updatedAt: new Date("2026-04-29T09:45:00.000Z"),
    },
  });

  await prisma.visitChecklistItem.createMany({
    data: checklistItems.map(([id, sequence, category, prompt, status]) => ({
      id,
      visitId: "visit_001",
      sequence,
      category,
      prompt,
      status,
      evidenceTranscript: null,
      linkedObservationId: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    })),
  });

  await prisma.escalation.create({
    data: {
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
  });

  await prisma.auditEvent.create({
    data: {
      id: "audit_seed_001",
      actorId: "admin_001",
      actorRole: "admin",
      visitId: "visit_001",
      clientId: "client_001",
      eventType: "DEMO_RESET",
      summary: "Visit data reset for the Worker Glasses CareWalk flow.",
      safetyFlagsJson: JSON.stringify(["demo_mode", "human_signoff_required"]),
      createdAt: now,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
