import Link from "next/link";
import type { ReactNode } from "react";
import { RoleIndicator } from "./RoleIndicator";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-700 text-lg font-bold text-white">CW</span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-stone-950">CareWalk</span>
              <span className="block text-xs text-stone-500">Worker Glasses visit flow</span>
            </span>
          </Link>
          <nav className="flex w-full min-w-0 flex-wrap items-center gap-2 text-sm font-medium sm:w-auto">
            <Link className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/dashboard">
              Worker
            </Link>
            <Link className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/supervisor">
              Supervisor
            </Link>
            <Link className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/family/demo">
              Family
            </Link>
            <Link className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/admin/reset">
              Reset
            </Link>
            <RoleIndicator />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-[100vw] px-4 py-6 sm:px-6 lg:max-w-7xl lg:py-8">{children}</main>
    </div>
  );
}
