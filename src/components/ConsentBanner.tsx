"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./ui";

const scopes = [
  ["manual_notes", "Manual notes"],
  ["voice_note", "Voice note"],
  ["rayban_media", "Worker Glasses"],
  ["family_summary", "Family summary"],
] as const;

export function ConsentBanner({
  visitId,
  hasConsent,
}: {
  visitId: string;
  hasConsent: boolean;
}) {
  const router = useRouter();
  const [consentState, setConsentState] = useState("granted");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "manual_notes",
    "voice_note",
    "rayban_media",
    "family_summary",
  ]);
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
    const captureModesAllowed = [
      selectedScopes.includes("manual_notes") ? "manual_checklist" : null,
      selectedScopes.includes("voice_note") ? "voice_transcript" : null,
      selectedScopes.includes("rayban_media") ? "rayban_media_upload" : null,
      selectedScopes.includes("voice_note") && selectedScopes.includes("rayban_media") ? "rayban_live_assist" : null,
    ].filter(Boolean);
    const response = await fetch(`/api/visits/${visitId}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: "worker_001",
        actorRole: "worker",
        consentState,
        scope: selectedScopes,
        captureModesAllowed,
        notes:
          consentState === "granted"
            ? "Client agreed to manual notes, voice note, Worker Glasses capture, and family summary."
            : "Consent not granted; safe mode manual checklist only.",
      }),
    });
    const payload = await response.json();
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    setMessage("Consent recorded.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">CareWalk capture consent</h2>
          <p className="mt-1 text-sm text-stone-700">
            Worker Glasses capture starts only after explicit consent.
          </p>
        </div>
        <Badge tone={hasConsent ? "green" : "amber"}>{hasConsent ? "Consent recorded" : "Consent needed"}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-[220px_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Consent</span>
          <select
            value={consentState}
            onChange={(event) => setConsentState(event.target.value)}
            className="min-h-11 w-full rounded-md border border-teal-200 bg-white px-3 text-sm"
          >
            <option value="granted">Granted</option>
            <option value="declined">Declined</option>
            <option value="not_requested">Not requested yet</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Allowed for this visit</legend>
          <div className="flex flex-wrap gap-2">
            {scopes.map(([value, label]) => (
              <label key={value} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(value)}
                  onChange={(event) => {
                    setSelectedScopes((current) =>
                      event.target.checked ? [...current, value] : current.filter((item) => item !== value),
                    );
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={submit}
          className="self-end rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Record consent
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-teal-900">{message}</p> : null}
    </div>
  );
}
