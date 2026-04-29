import type { ClientProfile, VisitSession } from "@/lib/schemas";
import { Badge, Card } from "./ui";

export function PreVisitBrief({ visit, client }: { visit: VisitSession; client: ClientProfile }) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Pre-visit brief</p>
          <h2 className="text-xl font-semibold text-stone-950">{client.preferredName} Liu</h2>
        </div>
        <Badge tone="green">Ready</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <BriefList title="Known risks" items={visit.preVisitBrief.knownRisks} />
        <BriefList title="Last unresolved actions" items={visit.preVisitBrief.lastUnresolvedActions} />
        <BriefList title="Today focus" items={visit.preVisitBrief.todayFocus} />
        <BriefList title="Communication preferences" items={client.communicationPreferences} />
      </div>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {visit.preVisitBrief.workerReminder}
      </div>
    </Card>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-stone-900">{title}</h3>
      <ul className="space-y-2 text-sm text-stone-600">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-stone-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
