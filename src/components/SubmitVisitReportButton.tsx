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
    <section className="rounded-lg border border-[#143f38] bg-[#143f38] p-4 text-white shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100">Final step</p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold leading-tight">
            <Send className="h-5 w-5 text-teal-100" /> Submit to supervisor
          </h2>
          <p className="mt-2 text-sm leading-6 text-teal-50">
            Demo submit sends this visit straight to the supervisor queue.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="min-h-12 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-[#143f38] shadow-sm hover:bg-teal-50 disabled:opacity-50 sm:w-auto"
        >
          Submit report
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-teal-50">{message}</p> : null}
    </section>
  );
}
