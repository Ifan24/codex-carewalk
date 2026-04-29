import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConsentBanner } from "@/components/ConsentBanner";
import { NavigationPreferencePanel } from "@/components/NavigationPreferencePanel";
import { PreVisitBrief } from "@/components/PreVisitBrief";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getVisitBundle } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export default async function VisitPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) notFound();
  const { visit, client } = bundle;
  const hasConsent = visit.consentEvents.at(-1)?.consentState === "granted";

  return (
    <AppShell>
      <PageHeader eyebrow="Visit detail" title={`Prepare for ${client.preferredName}`}>
        <p>Open the record, navigate, confirm consent, then start Worker Glasses.</p>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <NavigationPreferencePanel client={client} />
          <ConsentBanner visitId={visit.id} hasConsent={hasConsent} />
          <PreVisitBrief visit={visit} client={client} />
        </div>
        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-stone-950">{client.displayName}</h2>
            <p className="mt-2 text-sm text-stone-600">{client.carePlanSummary}</p>
            <p className="mt-3 text-sm font-semibold text-stone-900">Privacy</p>
            <p className="mt-1 text-sm text-stone-600">{client.privacyNotes}</p>
          </Card>
          <Card>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">Consent-first</Badge>
              <Badge tone="green">No diagnosis</Badge>
              <Badge tone="green">No med advice</Badge>
              <Badge tone="amber">Human sign-off required</Badge>
              <Badge tone="blue">Worker Glasses</Badge>
            </div>
            <div className="mt-5 grid gap-2">
              <Link href={`/visits/${visit.id}/capture`} className="rounded-md bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white">
                Arrived: start session
              </Link>
              <Link href={`/visits/${visit.id}/review`} className="rounded-md border border-stone-300 bg-white px-4 py-3 text-center text-sm font-semibold">
                Review outputs
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
