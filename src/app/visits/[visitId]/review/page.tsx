import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InlineEvidencePhoto } from "@/components/EvidencePhotos";
import { ReviewChecklistGenerator } from "@/components/ReviewChecklistGenerator";
import { SubmitVisitReportButton } from "@/components/SubmitVisitReportButton";
import { GenerateVisitPackButton, VisitOutputs } from "@/components/VisitOutputs";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundle } from "@/lib/db/service";
import { demoEvidenceForObservation, demoEvidencePhotos } from "@/lib/demo/evidence";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) notFound();
  const { visit } = bundle;
  const checklistComplete = visit.checklistItems.length;
  const observationCount = visit.observations.length || demoEvidencePhotos.length;
  const outputCount = visit.outputs.length;
  const reviewStats = [
    { label: "Checklist", value: `${checklistComplete}/${checklistComplete}`, badge: "ready", tone: "green" as const },
    { label: "Evidence", value: `${observationCount}`, badge: "ready", tone: "blue" as const },
    {
      label: "Visit pack",
      value: outputCount ? `${outputCount}/3` : "Draft",
      badge: outputCount ? "ready" : "needed",
      tone: outputCount ? ("green" as const) : ("amber" as const),
    },
    {
      label: "Risk",
      value: visit.escalation.riskLevel,
      badge: visit.escalation.riskLevel === "none" ? "clear" : "review",
      tone: visit.escalation.riskLevel === "none" ? ("neutral" as const) : ("amber" as const),
    },
  ];

  return (
    <AppShell>
      <PageHeader eyebrow="Review" title="Review and submit">
        <p>Check the visit pack, approve the worker note, then submit to the supervisor.</p>
      </PageHeader>
      <div className="mb-5 grid gap-2 sm:grid-cols-4">
        {reviewStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-[#ded8c9] bg-white px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{stat.label}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-lg font-semibold text-stone-950">{stat.value}</p>
              <Badge tone={stat.tone}>{stat.badge}</Badge>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
        <ReviewChecklistGenerator visitId={visit.id} />
        <GenerateVisitPackButton visitId={visit.id} />
          <section className="min-w-0 rounded-lg border border-[#ded8c9] bg-[#fffdf8] p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-700">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-tight text-stone-950">Visit pack drafts</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Generate worker, provider, and family-safe drafts, then approve the worker note before submission.
                </p>
              </div>
            </div>
            <VisitOutputs visit={visit} role="worker" />
          </section>
          <Card className="border-[#ded8c9] bg-[#fffdf8]">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-stone-950">Evidence and observations</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Review what supports the visit pack. Demo evidence appears here until structured observations are generated.
                </p>
              </div>
            </div>
            {visit.observations.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {visit.observations.map((observation) => {
                  const photo = demoEvidenceForObservation(observation);
                  return (
                    <div key={observation.id} className="rounded-md border border-stone-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{observation.label}</p>
                        <Badge tone={observation.status === "unknown" ? "amber" : "green"}>{observation.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{observation.description}</p>
                      <p className="mt-2 text-xs leading-5 text-stone-500">{observation.evidence.summary}</p>
                      {photo ? <InlineEvidencePhoto photo={photo} /> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {demoEvidencePhotos.map((photo) => (
                  <div key={photo.id} className="rounded-md border border-stone-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">{photo.badge}</p>
                    <h3 className="mt-2 text-sm font-semibold text-stone-950">{photo.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{photo.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <SubmitVisitReportButton visitId={visit.id} />
        </div>
        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <Card className="border-[#ded8c9] bg-white">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-950">Checklist</h2>
                  <Badge tone="green">{visit.checklistItems.length}/{visit.checklistItems.length}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-600">Care-plan prompts are complete for the demo flow.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {visit.checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <p className="min-w-0 flex-1 font-semibold text-stone-800">{item.category.replaceAll("_", " ")}</p>
                  <span className="text-xs font-semibold text-emerald-700">done</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-[#ded8c9] bg-white">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-950">Escalation</h2>
                  <Badge tone={visit.escalation.riskLevel === "medium" ? "amber" : "neutral"}>{visit.escalation.riskLevel}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-700">{visit.escalation.reason}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-teal-800">{visit.escalation.recommendedAction}</p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
