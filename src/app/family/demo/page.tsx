import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundles } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const [bundle] = await getVisitBundles();
  const approvedSummary = bundle?.visit.outputs.find(
    (output) => output.type === "family_summary" && output.status === "approved",
  );

  return (
    <AppShell>
      <PageHeader eyebrow="Family portal" title="Approved family-safe update">
        <p>Family members see only the provider-approved summary. Raw Worker Glasses media, observations, audit logs, and provider notes stay hidden.</p>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          {approvedSummary ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-semibold text-stone-950">{approvedSummary.title}</h2>
                <Badge tone="green">Approved</Badge>
              </div>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">{approvedSummary.body}</p>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <h2 className="text-xl font-semibold text-stone-950">No approved update yet.</h2>
              <p className="mt-2 text-sm text-stone-600">The provider must approve the family summary before Grace can view it.</p>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-stone-950">Privacy rules</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="green">No raw media</Badge>
            <Badge tone="green">No diagnosis</Badge>
            <Badge tone="green">No medication advice</Badge>
            <Badge tone="green">Approved only</Badge>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
