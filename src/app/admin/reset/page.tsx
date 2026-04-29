import Link from "next/link";
import { AdminReset } from "@/components/AdminReset";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader } from "@/components/ui";

export default function ResetPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Admin" title="Reset and quick links">
        <p>Restore a clean Worker Glasses walkthrough.</p>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <AdminReset />
        <Card>
          <h2 className="text-lg font-semibold text-stone-950">Quick links</h2>
          <div className="mt-4 grid gap-2">
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold" href="/login">
              Login
            </Link>
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold" href="/dashboard">
              Worker dashboard
            </Link>
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold" href="/supervisor">
              Supervisor dashboard
            </Link>
            <Link className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold" href="/family/demo">
              Family portal
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
