import { LoginForm } from "@/components/LoginForm";
import { Badge, Card, PageHeader } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg bg-teal-900 p-8 text-white shadow-sm">
            <Badge tone="green">Worker Glasses</Badge>
            <PageHeader eyebrow="CareWalk" title="Hands-free aged care visit copilot">
              <p className="text-teal-50">
                Capture consented Worker Glasses evidence, structure the visit, and route exceptions to the supervisor.
              </p>
            </PageHeader>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-white/10 p-4">Worker Glasses session</div>
              <div className="rounded-lg bg-white/10 p-4">Live checklist</div>
              <div className="rounded-lg bg-white/10 p-4">Human sign-off</div>
            </div>
          </section>
          <Card>
            <h2 className="text-xl font-semibold text-stone-950">Sign in</h2>
            <p className="mt-1 text-sm text-stone-600">Use the shared visit password.</p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
