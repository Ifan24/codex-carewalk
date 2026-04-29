import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuditTrail } from "@/components/AuditTrail";
import { InlineEvidencePhoto } from "@/components/EvidencePhotos";
import { SubmitVisitReportButton } from "@/components/SubmitVisitReportButton";
import { GenerateVisitPackButton, VisitOutputs } from "@/components/VisitOutputs";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundle } from "@/lib/db/service";
import { demoEvidenceForObservation } from "@/lib/demo/evidence";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) notFound();
  const { visit } = bundle;

  return (
    <AppShell>
      <PageHeader eyebrow="Review" title="Review and submit">
        <p>Check the visit pack, approve the worker note, then submit to the supervisor.</p>
      </PageHeader>
      <div className="space-y-5">
        <GenerateVisitPackButton visitId={visit.id} />
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">Checklist completion</h2>
            <Badge tone={visit.checklistItems.every((item) => ["done", "skipped", "concern"].includes(item.status)) ? "green" : "amber"}>
              {visit.checklistItems.filter((item) => ["done", "skipped", "concern"].includes(item.status)).length}/{visit.checklistItems.length}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {visit.checklistItems.map((item) => (
              <div key={item.id} className="rounded-md bg-stone-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-stone-900">{item.category.replaceAll("_", " ")}</p>
                  <Badge tone={item.status === "done" ? "green" : item.status === "concern" ? "amber" : "neutral"}>{item.status}</Badge>
                </div>
                {item.evidenceTranscript ? <p className="mt-1 text-stone-600">{item.evidenceTranscript}</p> : null}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">Escalation</h2>
            <Badge tone={visit.escalation.riskLevel === "medium" ? "amber" : "neutral"}>{visit.escalation.riskLevel}</Badge>
          </div>
          <p className="mt-2 text-sm text-stone-700">{visit.escalation.reason}</p>
          <p className="mt-1 text-sm font-semibold text-teal-800">{visit.escalation.recommendedAction}</p>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-stone-950">Structured observations</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {visit.observations.map((observation) => {
              const photo = demoEvidenceForObservation(observation);
              return (
                <div key={observation.id} className="rounded-lg bg-stone-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-950">{observation.label}</p>
                    <Badge tone={observation.status === "unknown" ? "amber" : "green"}>{observation.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{observation.description}</p>
                  <p className="mt-2 text-xs text-stone-500">{observation.evidence.summary}</p>
                  {photo ? <InlineEvidencePhoto photo={photo} /> : null}
                </div>
              );
            })}
          </div>
        </Card>
        <VisitOutputs visit={visit} role="worker" />
        <SubmitVisitReportButton visitId={visit.id} />
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-stone-950">Audit trail</h2>
          <AuditTrail events={bundle.auditEvents} />
        </Card>
      </div>
    </AppShell>
  );
}
