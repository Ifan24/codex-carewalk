"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export function SubmitVisitReportButton({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visitId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "worker_001", actorRole: "worker" }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    setMessage("Report submitted to supervisor.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
            <Send className="h-5 w-5 text-teal-700" /> Submit to supervisor
          </h2>
          <p className="mt-1 text-sm text-stone-700">
            Demo submit sends this visit straight to the supervisor queue.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Submit report
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-stone-800">{message}</p> : null}
    </div>
  );
}
