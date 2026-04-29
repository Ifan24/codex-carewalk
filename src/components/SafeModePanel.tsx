import { ShieldAlert } from "lucide-react";

export function SafeModePanel({ reasons }: { reasons: string[] }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Safe mode available</h3>
          <p className="mt-1 text-sm leading-6">
            Continue with the checklist. Private-room capture stays blocked, and human approval is always required.
          </p>
          {reasons.length ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              {reasons.map((reason) => (
                <span key={reason} className="rounded-full bg-white px-2.5 py-1">
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
