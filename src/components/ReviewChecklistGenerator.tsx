"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Route, ShieldCheck } from "lucide-react";
import { Badge } from "./ui";

type ReviewChecklistItem = {
  title: string;
  status: "ready" | "needs_attention";
  result: string;
  rationale: string;
};

type ReviewChecklist = {
  generatedBy: string;
  items: ReviewChecklistItem[];
};

function reviewLabel(generatedBy: string) {
  return generatedBy.startsWith("demo_fallback") ? "Demo AI fallback" : "AI generated";
}

export function ReviewChecklistGenerator({ visitId }: { visitId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checklist, setChecklist] = useState<ReviewChecklist | null>(null);

  async function generate() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visitId}/review-checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error ?? "Checklist generation failed.");
      return;
    }
    setChecklist(payload.checklist);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#c9ded7] bg-[#fbfaf4] shadow-[0_1px_0_rgba(24,32,28,0.08)]">
      <div className="border-b border-[#d9e6df] bg-[linear-gradient(135deg,#fbfaf4_0%,#f0f7f3_100%)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">
              <span className="h-px w-8 bg-teal-700" />
              AI review
            </div>
            <h2 className="text-2xl font-semibold leading-none text-stone-950 sm:text-3xl">
              Submit readiness
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
              A generated field sheet for the worker: what is ready, what still needs human judgement, and what stays out of family-facing notes.
            </p>
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={generate}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#113f38] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0d302b] disabled:opacity-50 md:w-auto"
            >
              <ClipboardCheck className="h-4 w-4" />
              {busy ? "Reviewing..." : "Generate review"}
            </button>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 md:text-right">
              Draft support only
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {message ? <p className="text-sm font-semibold text-rose-700">{message}</p> : null}
        {checklist ? (
          <div className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4e0d5] pb-3">
              <Badge tone={checklist.generatedBy.startsWith("demo_fallback") ? "amber" : "green"}>
                {reviewLabel(checklist.generatedBy)}
              </Badge>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{checklist.items.length} checks</span>
            </div>
            <div className="grid gap-2.5 lg:grid-cols-2">
              {checklist.items.map((item, index) => {
                const ready = item.status === "ready";
                return (
                  <article
                    key={`${item.title}-${item.result}`}
                    className="group min-w-0 rounded-md border border-[#ded8c9] bg-white p-3.5 shadow-[0_1px_0_rgba(24,32,28,0.06)]"
                  >
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-md border text-sm font-bold tabular-nums ${
                          ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-base font-semibold leading-snug text-stone-950">{item.title}</h3>
                            <p className="mt-2 break-words text-sm font-semibold leading-6 text-stone-800 sm:text-base">{item.result}</p>
                          </div>
                          <span
                            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                              ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                            aria-label={item.status.replace("_", " ")}
                            title={item.status.replace("_", " ")}
                          >
                            {ready ? <CheckCircle2 className="h-4 w-4" /> : <Route className="h-4 w-4" />}
                          </span>
                        </div>
                        <p className="mt-2 border-t border-dashed border-[#e5dfd2] pt-2 break-words text-sm leading-6 text-stone-600">
                          {item.rationale}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="flex items-start gap-2 rounded-md border border-[#d9e6df] bg-[#f7fbf8] px-3 py-2 text-xs leading-5 text-stone-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#113f38]" />
              AI output remains draft support. Worker sign-off and supervisor review stay as the final gates.
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-3">
            {["Visit facts", "Safety guardrails", "Human next steps"].map((label, index) => (
              <div key={label} className="rounded-md border border-[#ded8c9] bg-white px-3 py-3 text-sm font-semibold text-stone-700">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-stone-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
