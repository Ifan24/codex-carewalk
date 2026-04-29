import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MatchedEvidencePanel } from "@/components/EvidencePhotos";
import { RayBanLiveAssistPanel } from "@/components/RayBanLiveAssistPanel";
import { VisitChecklistPanel } from "@/components/VisitChecklistPanel";
import { Badge, PageHeader } from "@/components/ui";
import { getVisitBundle } from "@/lib/db/service";

export const dynamic = "force-dynamic";

export default async function CapturePage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const bundle = await getVisitBundle(visitId);
  if (!bundle) notFound();
  const hasConsent = bundle.visit.consentEvents.some((event) => event.consentState === "granted");

  return (
    <AppShell>
      <PageHeader eyebrow="Live session" title="Worker Glasses welfare check">
        <p>Start live, follow each prompt, then end the session for review.</p>
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone="blue">Worker Glasses</Badge>
        <Badge tone="amber">Private contexts blocked</Badge>
        <Badge tone="green">Checklist ready</Badge>
      </div>
      <div className="space-y-5">
        <ConsentBanner visitId={bundle.visit.id} hasConsent={hasConsent} />
        <RayBanLiveAssistPanel visit={bundle.visit} />
        <MatchedEvidencePanel />
        <VisitChecklistPanel visit={bundle.visit} />
      </div>
      <div className="sticky bottom-0 mt-6 rounded-lg border border-stone-200 bg-[#fffdf8]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl justify-end">
          <Link href={`/visits/${visitId}/review`} className="rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white">
            Continue to review
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
