import { AppShell } from "@/components/AppShell";
import { FamilyUpdateCard } from "@/components/FamilyUpdateCard";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundles } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const [bundle] = await getVisitBundles();
  const approvedSummary = bundle?.visit.outputs.find(
    (output) => output.type === "family_summary" && output.status === "approved",
  );
  const draftSummary = bundle?.visit.outputs.find((output) => output.type === "family_summary");
  const demoSummary = approvedSummary ?? draftSummary;
  const generatedUpdate = {
    title: "Margaret family update",
    body:
      demoSummary?.body ??
      "Margaret received her scheduled visit today and appeared settled. Meals were visible, the team noted a loose rug for follow-up, and Margaret mentioned dizziness yesterday with no current distress observed during the visit.",
    statusLabel: approvedSummary ? "Approved" : "Generated draft",
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Family portal" title="Approved family-safe update">
        <p>Family members see only the provider-approved summary. Raw Worker Glasses media, observations, audit logs, and provider notes stay hidden.</p>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <FamilyUpdateCard title={generatedUpdate.title} body={generatedUpdate.body} statusLabel={generatedUpdate.statusLabel} />
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
