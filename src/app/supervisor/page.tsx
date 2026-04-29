import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FollowUpTaskBoard } from "@/components/FollowUpTaskBoard";
import { VisitOutputs } from "@/components/VisitOutputs";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundles } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export default async function SupervisorPage() {
  const bundles = await getVisitBundles();
  const exceptions = bundles.filter(({ visit, followUpTasks }) => visit.status === "submitted" || followUpTasks.length || ["medium", "high", "urgent"].includes(visit.escalation.riskLevel));

  return (
    <AppShell>
      <PageHeader eyebrow="Supervisor dashboard" title="Triage submitted welfare checks">
        <p>Supervisor time stays focused on accepted reports, recommended follow-up tasks, and outliers from the visit journal.</p>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <section className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">Exception queue</h2>
              <Badge tone={exceptions.length ? "amber" : "green"}>{exceptions.length} item(s)</Badge>
            </div>
          </Card>
          {exceptions.length ? (
            exceptions.map(({ visit, client }) => (
              <Card key={visit.id}>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="amber">{visit.escalation.riskLevel}</Badge>
                  <Badge>{visit.status}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-stone-950">{client.preferredName}</h3>
                <p className="mt-2 break-words text-sm text-stone-700">{visit.escalation.reason}</p>
                <p className="mt-2 break-words text-sm font-semibold text-teal-800">{visit.escalation.recommendedAction}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/visits/${visit.id}/review`} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold">
                    Audit detail
                  </Link>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <p className="text-sm text-stone-600">No medium or high risk exceptions yet. Generate Maggie visit pack first.</p>
            </Card>
          )}
        </section>
        <section className="space-y-5">
          {bundles.map(({ visit, client, followUpTasks }) => (
            <div key={visit.id} className="space-y-5">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-teal-700">Visit record</p>
                    <h2 className="text-2xl font-semibold text-stone-950">{client.displayName}</h2>
                  </div>
                  <Badge tone={visit.escalation.riskLevel === "medium" ? "amber" : "neutral"}>{visit.escalation.riskLevel}</Badge>
                </div>
              </Card>
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-stone-950">Follow-up task queue</h2>
                  <Badge tone={followUpTasks.length ? "amber" : "green"}>{followUpTasks.length} task(s)</Badge>
                </div>
                <FollowUpTaskBoard tasks={followUpTasks} />
              </Card>
              <VisitOutputs visit={visit} role="supervisor" />
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
