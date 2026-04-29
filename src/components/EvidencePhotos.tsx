import { Camera, MessageSquareText } from "lucide-react";
import type { DemoEvidencePhoto } from "@/lib/demo/evidence";
import { demoEvidencePhotos } from "@/lib/demo/evidence";
import { Badge } from "./ui";

export function EvidencePhotoCard({ photo, compact = false }: { photo: DemoEvidencePhoto; compact?: boolean }) {
  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className={compact ? "relative aspect-[5/3] bg-stone-100" : "relative aspect-[4/3] bg-stone-100"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageSrc} alt={photo.imageAlt} className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
          <Camera className="h-3.5 w-3.5" />
          {photo.badge}
        </span>
      </div>
      <div className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-950">{photo.title}</h3>
          <Badge tone={photo.id === "rug_detected_hazard" ? "amber" : photo.id === "medicines_supervisor_request" ? "red" : "blue"}>
            {photo.checklistCategory.replaceAll("_", " ")}
          </Badge>
        </div>
        <p className="flex gap-2 text-sm leading-6 text-stone-700">
          <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
          <span>{photo.transcript}</span>
        </p>
      </div>
    </article>
  );
}

export function InlineEvidencePhoto({ photo }: { photo: DemoEvidencePhoto }) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="relative aspect-[5/3] bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageSrc} alt={photo.imageAlt} className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">{photo.badge}</span>
      </div>
      <p className="px-3 py-2 text-xs leading-5 text-stone-600">{photo.transcript}</p>
    </div>
  );
}

export function MatchedEvidencePanel() {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Matched evidence</p>
          <h2 className="mt-1 text-xl font-semibold text-stone-950">Photo and transcript samples</h2>
        </div>
        <Badge tone="blue">{demoEvidencePhotos.length} matches</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {demoEvidencePhotos.map((photo) => (
          <EvidencePhotoCard key={photo.id} photo={photo} compact />
        ))}
      </div>
    </section>
  );
}
