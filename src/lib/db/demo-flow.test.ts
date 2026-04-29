import { describe, expect, it } from "vitest";
import {
  addConsentEvent,
  addMediaAsset,
  addLiveRayBanFrame,
  addLiveRayBanTranscript,
  applyChecklistVoiceCommand,
  answerLiveRayBanQuestion,
  endLiveRayBanSession,
  applyRedaction,
  generateVisitPack,
  getLatestLiveRayBanFrame,
  getVisitBundle,
  resetDemoData,
  saveLiveRayBanSnapshot,
  signOffOutput,
  startLiveRayBanSession,
  structureRawNote,
  submitVisitReport,
  updateFollowUpTask,
} from "./service";
import { demoRawNote } from "@/data/seed";

describe("Worker Glasses visit flow", () => {
  function tokenFrom(event: Awaited<ReturnType<typeof startLiveRayBanSession>>) {
    const token = event.payload.sessionToken;
    if (typeof token !== "string") throw new Error("Missing session token");
    return token;
  }

  it("rejects media without Worker Glasses consent, then completes consented media generation", async () => {
    await resetDemoData();
    await expect(
      addMediaAsset({
        visitId: "visit_001",
        actorId: "worker_001",
        actorRole: "worker",
        source: "rayban_meta",
        captureContext: "hallway",
        fileName: "rayban.jpg",
        mimeType: "image/jpeg",
        previewDataUrl: "data:image/jpeg;base64,abc",
      }),
    ).rejects.toThrow(/consent/i);

    await addConsentEvent({
      visitId: "visit_001",
      clientId: "client_001",
      actorId: "worker_001",
      actorRole: "worker",
      consentState: "granted",
      scope: ["manual_notes", "voice_note", "rayban_media", "phone_photo", "family_summary"],
      captureModesAllowed: ["manual_checklist", "voice_transcript", "rayban_media_upload", "phone_photo"],
      notes: "Granted for Worker Glasses hallway evidence.",
    });

    await expect(
      addMediaAsset({
        visitId: "visit_001",
        actorId: "worker_001",
        actorRole: "worker",
        source: "rayban_meta",
        captureContext: "bathroom_interior",
        fileName: "blocked.jpg",
        mimeType: "image/jpeg",
        previewDataUrl: "data:image/jpeg;base64,abc",
      }),
    ).rejects.toThrow(/blocked/i);

    const media = await addMediaAsset({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      source: "rayban_meta",
      captureContext: "hallway",
      fileName: "rayban.jpg",
      mimeType: "image/jpeg",
      previewDataUrl: "data:image/jpeg;base64,abc",
    });

    await structureRawNote({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      rawNote: demoRawNote,
      captureMode: "voice_transcript",
    });
    await applyRedaction({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      mediaId: media.id,
      status: "applied",
    });
    await generateVisitPack({ visitId: "visit_001", actorId: "worker_001", actorRole: "worker" });
    const bundle = await getVisitBundle("visit_001");
    expect(bundle?.visit.escalation.riskLevel).toBe("medium");
    expect(bundle?.visit.outputs).toHaveLength(3);
    expect(bundle?.visit.outputs.find((output) => output.type === "family_summary")?.body).not.toMatch(/raw media|redaction/i);
    expect(bundle?.visit.outputs.find((output) => output.type === "worker_note")?.body).toContain("Worker Glasses media");
  });

  it("saves Worker Glasses hazard and service question summaries only when the worker ends", async () => {
    await resetDemoData();
    await addConsentEvent({
      visitId: "visit_001",
      clientId: "client_001",
      actorId: "worker_001",
      actorRole: "worker",
      consentState: "granted",
      scope: ["manual_notes", "voice_note", "rayban_media", "family_summary"],
      captureModesAllowed: ["manual_checklist", "voice_transcript", "rayban_media_upload", "rayban_live_assist"],
      notes: "Granted for Worker Glasses assist.",
    });

    await addLiveRayBanTranscript({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      text: "Maggie asked how to book next Friday. Worker noticed a loose rug near the hallway walkway.",
    });
    await answerLiveRayBanQuestion({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      question: "How do I book the next session on Friday with your NDIS service?",
    });

    let bundle = await getVisitBundle("visit_001");
    expect(bundle?.visit.observations).toHaveLength(0);

    await endLiveRayBanSession({ visitId: "visit_001", actorId: "worker_001", actorRole: "worker" });
    bundle = await getVisitBundle("visit_001");

    expect(bundle?.visit.observations.some((observation) => observation.label === "Worker Glasses hazard summary")).toBe(true);
    expect(bundle?.visit.observations.some((observation) => observation.label === "Live service question answered")).toBe(true);
    expect(bundle?.visit.escalation.riskLevel).toBe("medium");
  });

  it("accepts Worker Glasses frames with an active token and saves selected snapshots", async () => {
    await resetDemoData();
    await addConsentEvent({
      visitId: "visit_001",
      clientId: "client_001",
      actorId: "worker_001",
      actorRole: "worker",
      consentState: "granted",
      scope: ["manual_notes", "voice_note", "rayban_media", "family_summary"],
      captureModesAllowed: ["manual_checklist", "voice_transcript", "rayban_media_upload", "rayban_live_assist"],
      notes: "Granted for Worker Glasses assist.",
    });
    const token = tokenFrom(
      await startLiveRayBanSession({ visitId: "visit_001", actorId: "worker_001", actorRole: "worker" }),
    );

    await expect(
      addLiveRayBanFrame({
        visitId: "visit_001",
        actorId: "worker_001",
        actorRole: "worker",
        frameId: "frame_bad",
        sessionToken: "wrong",
        captureContext: "hallway",
        jpegBase64: Buffer.from("frame").toString("base64"),
      }),
    ).rejects.toThrow(/token/i);

    await expect(
      addLiveRayBanFrame({
        visitId: "visit_001",
        actorId: "worker_001",
        actorRole: "worker",
        frameId: "frame_private",
        sessionToken: token,
        captureContext: "bathroom_interior",
        jpegBase64: Buffer.from("frame").toString("base64"),
      }),
    ).rejects.toThrow(/blocked/i);

    await addLiveRayBanFrame({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      frameId: "frame_001",
      sessionToken: token,
      captureContext: "hallway",
      jpegBase64: Buffer.from("rayban-pov").toString("base64"),
    });
    expect(getLatestLiveRayBanFrame("visit_001")?.frameId).toBe("frame_001");

    const media = await saveLiveRayBanSnapshot({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      sessionToken: token,
      frameId: "frame_001",
    });
    expect(media.source).toBe("rayban_meta");
    expect(media.redactionStatus).toBe("pending");
  });

  it("drives the care-plan checklist by voice and submits follow-up tasks to supervisor", async () => {
    await resetDemoData();
    await addConsentEvent({
      visitId: "visit_001",
      clientId: "client_001",
      actorId: "worker_001",
      actorRole: "worker",
      consentState: "granted",
      scope: ["manual_notes", "voice_note", "rayban_media", "family_summary"],
      captureModesAllowed: ["manual_checklist", "voice_transcript", "rayban_media_upload", "rayban_live_assist"],
      notes: "Granted for production checklist flow.",
    });

    await applyChecklistVoiceCommand({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      transcript: "Concern Maggie said she was dizzy this morning but is settled now.",
    });
    await applyChecklistVoiceCommand({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      transcript: "Done meals are visible in the fridge.",
    });
    await applyChecklistVoiceCommand({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      transcript: "Concern the hallway rug is curled near the walking path.",
    });
    await applyChecklistVoiceCommand({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      transcript: "Concern medicines seem too few to last until the next visit.",
    });
    await applyChecklistVoiceCommand({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      transcript: "Done no new service request.",
    });
    await applyChecklistVoiceCommand({
      visitId: "visit_001",
      actorId: "worker_001",
      actorRole: "worker",
      transcript: "Done summary explained and visit closed.",
    });

    await generateVisitPack({ visitId: "visit_001", actorId: "worker_001", actorRole: "worker" });
    const beforeSubmit = await getVisitBundle("visit_001");
    const workerNote = beforeSubmit?.visit.outputs.find((output) => output.type === "worker_note");
    expect(workerNote).toBeTruthy();
    await signOffOutput({
      visitId: "visit_001",
      outputId: workerNote?.id ?? "",
      actorId: "worker_001",
      actorRole: "worker",
    });

    const submitted = await submitVisitReport({ visitId: "visit_001", actorId: "worker_001", actorRole: "worker" });
    expect(submitted?.visit.status).toBe("submitted");
    expect(submitted?.followUpTasks.map((task) => task.actionType)).toEqual(
      expect.arrayContaining(["home_hazard", "phone_call", "medication_supply_followup"]),
    );

    const task = submitted?.followUpTasks.find((candidate) => candidate.actionType === "phone_call");
    expect(task).toBeTruthy();
    const updated = await updateFollowUpTask({
      taskId: task?.id ?? "",
      actorId: "supervisor_001",
      actorRole: "supervisor",
      status: "assigned",
      assignedTo: "supervisor_001",
    });
    expect(updated.status).toBe("assigned");
  });
});
