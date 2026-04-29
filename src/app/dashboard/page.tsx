import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NavigationPreferencePanel } from "@/components/NavigationPreferencePanel";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundles } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const bundles = await getVisitBundles();

  return (
    <AppShell>
      <PageHeader eyebrow="Worker dashboard" title="Today starts with Maggie visit">
        <p>Open the patient, navigate, record consent, then start the Worker Glasses welfare check.</p>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {bundles.map(({ visit, client }) => (
            <Card key={visit.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge tone="blue">Worker Glasses</Badge>
                    <Badge tone={visit.status === "signed_off" ? "green" : "amber"}>{visit.status}</Badge>
                  </div>
                  <h2 className="text-2xl font-semibold text-stone-950">{client.displayName}</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {new Date(visit.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to{" "}
                    {new Date(visit.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} |{" "}
                    {client.address.suburb}, {client.address.state}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.knownRisks.map((risk) => (
                      <Badge key={risk}>{risk}</Badge>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/visits/${visit.id}`}
                  className="basis-full rounded-md bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-800 sm:basis-auto"
                >
                  Start visit
                </Link>
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {bundles[0] ? <NavigationPreferencePanel client={bundles[0].client} /> : null}
        </div>
      </div>
    </AppShell>
  );
}
