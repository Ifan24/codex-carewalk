"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Mic, SkipForward, TriangleAlert, Volume2 } from "lucide-react";
import type { VisitChecklistItem, VisitSession } from "@/lib/schemas";
import { demoEvidenceForChecklistCategory } from "@/lib/demo/evidence";
import { InlineEvidencePhoto } from "./EvidencePhotos";
import { Badge } from "./ui";

function toneFor(status: VisitChecklistItem["status"]) {
  if (status === "done") return "green" as const;
  if (status === "concern") return "amber" as const;
  if (status === "skipped") return "neutral" as const;
  return "blue" as const;
}

function iconFor(status: VisitChecklistItem["status"]) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  if (status === "concern") return <TriangleAlert className="h-4 w-4 text-amber-700" />;
  if (status === "skipped") return <SkipForward className="h-4 w-4 text-stone-500" />;
  return <Circle className="h-4 w-4 text-sky-700" />;
}

export function VisitChecklistPanel({ visit }: { visit: VisitSession }) {
  const router = useRouter();
  const demoChecklistItems = visit.checklistItems.map((item) => ({ ...item, status: "done" as const }));
  const completed = demoChecklistItems.length;
  const [selectedId, setSelectedId] = useState(demoChecklistItems[0]?.id ?? "");
  const selectedIndex = demoChecklistItems.findIndex((item) => item.id === selectedId);
  const selectedItem = demoChecklistItems[selectedIndex] ?? demoChecklistItems[0];
  const [evidenceTranscript, setEvidenceTranscript] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedPhoto = selectedItem ? demoEvidenceForChecklistCategory(selectedItem.category) : null;

  async function updateItem(status: VisitChecklistItem["status"]) {
    if (!selectedItem) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visit.id}/checklist/${selectedItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: "worker_001",
        actorRole: "worker",
        status,
        evidenceTranscript,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    setEvidenceTranscript("");
    setMessage(`Checklist marked ${status}.`);
    if (status === "done" && demoChecklistItems.length) {
      const nextIndex = selectedIndex >= 0 ? (selectedIndex + 1) % demoChecklistItems.length : 0;
      setSelectedId(demoChecklistItems[nextIndex].id);
      return;
    }
    router.refresh();
  }

  async function submitVoiceCommand() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visit.id}/checklist/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: "worker_001",
        actorRole: "worker",
        transcript: voiceTranscript,
        itemId: selectedItem?.id,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    setVoiceTranscript("");
    setMessage(`Voice command captured as ${payload.status}.`);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Checklist</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-stone-950">
            <Volume2 className="h-5 w-5" /> Step-by-step welfare checks
          </h2>
        </div>
        <Badge tone={completed === visit.checklistItems.length ? "green" : "blue"}>
          {completed}/{visit.checklistItems.length} complete
        </Badge>
      </div>

      {selectedItem ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2">
            {visit.checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left text-sm ${
                  selectedItem.id === item.id ? "border-teal-300 bg-teal-50" : "border-stone-200 bg-stone-50"
                }`}
              >
                <span className="mt-0.5">{iconFor("done")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-stone-950">
                    {item.sequence}. {item.category.replaceAll("_", " ")}
                  </span>
                  <span className="mt-1 block leading-5 text-stone-600">{item.prompt}</span>
                  {item.evidenceTranscript ? (
                    <span className="mt-2 block rounded bg-white px-2 py-1 text-xs text-stone-600">{item.evidenceTranscript}</span>
                  ) : null}
                </span>
                <Badge tone={toneFor("done")}>done</Badge>
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-lg border border-teal-100 bg-teal-50 p-4">
            <div>
              <p className="text-sm font-semibold text-teal-900">Current prompt</p>
              <p className="mt-2 text-lg font-semibold leading-7 text-stone-950">{selectedItem.prompt}</p>
              {selectedPhoto ? <InlineEvidencePhoto photo={selectedPhoto} /> : null}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Evidence note</span>
              <textarea
                value={evidenceTranscript}
                onChange={(event) => setEvidenceTranscript(event.target.value)}
                className="min-h-24 w-full rounded-md border border-teal-200 bg-white p-3 text-sm leading-6"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => updateItem("done")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Done
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => updateItem("concern")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
              >
                <TriangleAlert className="h-4 w-4" />
                Concern
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => updateItem("skipped")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>
            </div>

            <div className="rounded-md bg-white p-3">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Mic className="h-4 w-4" /> Voice command transcript
                </span>
                <input
                  value={voiceTranscript}
                  onChange={(event) => setVoiceTranscript(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitVoiceCommand}
                  className="rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Apply voice
                </button>
              </div>
            </div>
            {message ? <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-stone-800">{message}</p> : null}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
          Checklist is not ready.
        </div>
      )}
    </section>
  );
}
