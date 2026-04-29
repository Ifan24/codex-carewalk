import { z } from "zod";
import { demoRawNote } from "@/data/seed";
import { demoEvidencePhotos } from "@/lib/demo/evidence";
import type { VisitBundle } from "@/lib/schemas";

const ReviewChecklistItemSchema = z
  .object({
    title: z.string(),
    status: z.enum(["ready", "needs_attention"]),
    result: z.string(),
    rationale: z.string(),
    source: z.string().optional(),
  })
  .strict();

const ReviewChecklistResponseSchema = z
  .object({
    generatedBy: z.string(),
    items: z.array(ReviewChecklistItemSchema).min(3).max(7),
  })
  .strict();

export type ReviewChecklist = z.infer<typeof ReviewChecklistResponseSchema>;

function fallbackReviewChecklist(bundle: VisitBundle, reason = "no_openai_api_key"): ReviewChecklist {
  const hasOutputs = bundle.visit.outputs.length > 0;
  const workerNoteApproved = bundle.visit.outputs.some((output) => output.type === "worker_note" && output.status === "approved");

  return {
    generatedBy: `demo_fallback:${reason}`,
    items: [
      {
        title: "Care-plan prompts covered",
        status: "ready",
        result: "All six care-plan prompts are represented in the mock visit.",
        rationale: "The mock visit covers wellbeing, nutrition, falls hazard, medication supply, service requests, and close-out.",
        source: "mock.completedChecklist",
      },
      {
        title: "Evidence matched to concerns",
        status: "ready",
        result: "Rug, dizziness, and medication supply moments are matched to reviewable evidence.",
        rationale: "Demo evidence links the rug hazard, dizziness chat, and medication supply uncertainty to supervisor-reviewable notes.",
        source: "mock.evidenceMoments",
      },
      {
        title: "Safety constraints preserved",
        status: "ready",
        result: "Clinical uncertainty and family privacy boundaries are preserved.",
        rationale: "The review should keep medication status as an observation only and avoid diagnosis, dose advice, or raw media in family text.",
        source: "mock.guardrails",
      },
      {
        title: "Worker approval path",
        status: "needs_attention",
        result: workerNoteApproved ? "Worker note is approved." : "Worker sign-off is still required.",
        rationale: hasOutputs
          ? workerNoteApproved
            ? "The worker note has been approved."
            : "Generated outputs exist, but the worker note still needs approval."
          : "Generate the visit pack before submitting.",
        source: "visit.outputs",
      },
      {
        title: "Supervisor routing prepared",
        status: "needs_attention",
        result: "Supervisor review should receive the falls, dizziness, and medication supply follow-ups.",
        rationale: "Falls risk, dizziness, and medication supply uncertainty should route to supervisor review after the worker submits.",
        source: "mock.followUpQueue",
      },
      {
        title: "Family-safe summary boundary",
        status: "ready",
        result: "Family summary should stay high-level and provider-approved.",
        rationale: "Family-facing text should include only approved wellbeing and follow-up details, not raw media or internal audit detail.",
        source: "mock.familySummaryGuardrails",
      },
    ],
  };
}

function mockReviewInput(bundle: VisitBundle) {
  return {
    task: "Generate a demo-ready Review and submit checklist for the worker before final submission.",
    client: {
      preferredName: bundle.client.preferredName,
      knownRisks: bundle.client.knownRisks,
      privacyNotes: bundle.client.privacyNotes,
    },
    mockVisit: {
      workerRawNote: demoRawNote,
      completedChecklist: [
        { category: "wellbeing", result: "Maggie seemed settled and mentioned dizziness yesterday, with no current distress noted." },
        { category: "nutrition", result: "Meals were visible in the fridge." },
        { category: "falls_hazard", result: "A loose or curled rug was observed near the hallway walking path." },
        { category: "medication_supply", result: "Medication box was present; use and dose were not assessed." },
        { category: "service_request", result: "No urgent service booking issue was recorded in the mock note." },
        { category: "close_out", result: "Worker should confirm what will be reported and submit for supervisor review." },
      ],
      evidenceMoments: demoEvidencePhotos.map((photo) => ({
        title: photo.title,
        summary: photo.summary,
        transcript: photo.transcript,
        category: photo.checklistCategory,
      })),
      expectedSubmitState: {
        checklistComplete: true,
        observationsReadyToGenerate: true,
        generateVisitPackNext: bundle.visit.outputs.length === 0,
        workerSignoffRequired: true,
        supervisorReviewRequired: true,
      },
      outputs: bundle.visit.outputs.map((output) => ({
        type: output.type,
        status: output.status,
        safetyFlags: output.safetyFlags,
      })),
      guardrails: [
        "No diagnosis.",
        "No medication advice.",
        "Keep medication supply as an unknown or follow-up item unless directly observed.",
        "Do not expose raw media, redaction details, audit logs, or worker-only notes to family.",
      ],
    },
  };
}

function extractOutputText(response: unknown) {
  if (typeof response !== "object" || response === null) return "";
  const direct = "output_text" in response ? response.output_text : undefined;
  if (typeof direct === "string") return direct;

  const output = "output" in response ? response.output : undefined;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (typeof item !== "object" || item === null || !("content" in item) || !Array.isArray(item.content)) return [];
      const contentItems: unknown[] = item.content;
      return contentItems.map((content) => {
        if (typeof content !== "object" || content === null || !("text" in content)) return "";
        return typeof content.text === "string" ? content.text : "";
      });
    })
    .join("");
}

function parseJsonText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("GPT response did not include JSON.");
    return JSON.parse(match[0]);
  }
}

export async function generateReviewChecklist(bundle: VisitBundle): Promise<ReviewChecklist> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_REVIEW_MODEL ?? "gpt-5.5";
  if (!apiKey) return fallbackReviewChecklist(bundle);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          "You generate a polished, demo-ready aged-care Review and submit checklist. Return strict JSON only. Do not diagnose, provide medication advice, or expose raw media details.",
        input: `Create exactly 6 concise checklist items from this completed mock CareWalk visit scenario. The checklist should help the worker decide what is ready and what still needs human action before submitting. Use status "ready" for completed checks and "needs_attention" only for human sign-off or supervisor routing steps. Do not say there are no observations just because the database is freshly seeded; use the mockVisit data as the source of truth. Return user-facing result text, not internal labels like mockVisit.completedChecklist.wellbeing. JSON shape: {"generatedBy":"${model}","items":[{"title":"...","status":"ready","result":"plain user-facing result","rationale":"short reason"}]}\n\n${JSON.stringify(mockReviewInput(bundle))}`,
        max_output_tokens: 1800,
      }),
    });

    if (!response.ok) return fallbackReviewChecklist(bundle, `openai_${response.status}`);
    const payload = await response.json();
    const parsed = parseJsonText(extractOutputText(payload));
    const parsedItems = Array.isArray(parsed.items)
      ? parsed.items.map((item: Record<string, unknown>) => ({
          ...item,
          result: typeof item.result === "string" ? item.result : typeof item.source === "string" ? item.source : item.rationale,
        }))
      : parsed.items;
    return ReviewChecklistResponseSchema.parse({ ...parsed, items: parsedItems, generatedBy: parsed.generatedBy ?? model });
  } catch (error) {
    return fallbackReviewChecklist(bundle, error instanceof Error ? error.message : "openai_error");
  }
}
