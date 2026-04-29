"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck, FileText, Sparkles, Undo2 } from "lucide-react";
import type { OutputDocument, Role, VisitSession } from "@/lib/schemas";
import { Badge } from "./ui";

const labels: Record<OutputDocument["type"], string> = {
  worker_note: "Worker note",
  provider_compliance_log: "Provider compliance log",
  family_summary: "Family summary",
};

export function GenerateVisitPackButton({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visitId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "worker_001", actorRole: "worker" }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) setMessage(payload.error);
    else {
      setMessage("Visit pack generated. Review before sign-off.");
      router.refresh();
    }
  }

  return (
    <section className="rounded-lg border border-[#d5e4dd] bg-[#f6fbf8] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">
            <span className="h-px w-6 bg-teal-700" />
            Draft pack
          </p>
          <h2 className="flex items-center gap-2 text-xl font-semibold leading-tight text-stone-950">
            <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
            Generate visit pack
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">
            Creates worker note, provider compliance log, and family summary from one structured visit.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50 sm:w-auto"
        >
          Generate visit pack
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-stone-800">{message}</p> : null}
    </section>
  );
}

export function VisitOutputs({ visit, role }: { visit: VisitSession; role: Role }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {visit.outputs.map((output) => (
        <OutputCard key={output.id} visitId={visit.id} output={output} role={role} escalationStatus={visit.escalation.status} />
      ))}
      {!visit.outputs.length ? (
        <div className="rounded-md border border-dashed border-[#cfc7b8] bg-[#fffdf8] p-5 text-sm leading-6 text-stone-600 lg:col-span-3">
          <FileText className="mb-3 h-5 w-5 text-stone-500" aria-hidden="true" />
          <p className="font-semibold text-stone-900">No visit pack drafts yet.</p>
          <p className="mt-1">Generate the pack after checking AI readiness, then review and approve the worker note.</p>
        </div>
      ) : null}
    </div>
  );
}

function OutputCard({
  visitId,
  output,
  role,
  escalationStatus,
}: {
  visitId: string;
  output: OutputDocument;
  role: Role;
  escalationStatus: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState(output.body);
  const [message, setMessage] = useState("");
  const canApprove =
    (role === "worker" && output.type === "worker_note") ||
    (role === "supervisor" && (output.type === "provider_compliance_log" || output.type === "family_summary"));
  const blockedByRole = output.type === "family_summary" && role === "worker" && escalationStatus !== "none";

  async function approve() {
    const response = await fetch(`/api/visits/${visitId}/signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputId: output.id,
        actorId: role === "supervisor" ? "supervisor_001" : "worker_001",
        actorRole: role,
      }),
    });
    const payload = await response.json();
    if (!payload.ok) setMessage(payload.error);
    else {
      setMessage("Approved.");
      router.refresh();
    }
  }

  async function undoApprove() {
    const response = await fetch(`/api/visits/${visitId}/signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputId: output.id,
        actorId: role === "supervisor" ? "supervisor_001" : "worker_001",
        actorRole: role,
        action: "undo",
      }),
    });
    const payload = await response.json();
    if (!payload.ok) setMessage(payload.error);
    else {
      setMessage("Approval undone.");
      router.refresh();
    }
  }

  return (
    <article className="flex min-h-[420px] flex-col rounded-md border border-[#ded8c9] bg-white p-4 shadow-[0_1px_0_rgba(24,32,28,0.06)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-teal-700">{labels[output.type]}</p>
          <h3 className="text-lg font-semibold text-stone-950">{output.title}</h3>
        </div>
        <Badge tone={output.status === "approved" ? "green" : "amber"}>{output.status}</Badge>
      </div>
      <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
        {output.status === "approved" ? "Approved AI draft. Human sign-off recorded." : "AI draft. Human sign-off required."}
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="min-h-44 flex-1 rounded-md border border-stone-300 bg-[#fffdf8] p-3 text-sm leading-6"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {output.safetyFlags.map((flag) => (
          <Badge key={flag} tone={flag.includes("no_") || flag.includes("family") ? "green" : "neutral"}>
            {flag}
          </Badge>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-stone-500">Evidence: {output.evidenceObservationIds.join(", ") || "none"}</p>
      {blockedByRole ? <p className="mt-3 text-sm text-amber-800">Worker cannot approve family summary while escalation exists.</p> : null}
      <button
        type="button"
        disabled={!canApprove}
        onClick={output.status === "approved" ? undoApprove : approve}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {output.status === "approved" ? <Undo2 className="h-4 w-4" /> : <FileCheck className="h-4 w-4" />}
        {output.status === "approved" ? "Undo approve" : "Approve"}
      </button>
      {message ? <p className="mt-2 text-sm font-semibold text-stone-800">{message}</p> : null}
    </article>
  );
}
