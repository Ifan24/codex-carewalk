import Link from "next/link";
import type { ReactNode } from "react";
import { RoleIndicator } from "./RoleIndicator";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-700 text-lg font-bold text-white shadow-sm sm:h-12 sm:w-12">
              CW
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">CareWalk</span>
              <span className="block text-sm leading-tight text-stone-500">Worker Glasses visit flow</span>
            </span>
          </Link>
          <nav className="-mx-1 flex w-[calc(100%+0.5rem)] min-w-0 items-center gap-1 overflow-x-auto px-1 pb-1 text-sm font-semibold md:mx-0 md:w-auto md:overflow-visible md:pb-0">
            <Link className="shrink-0 rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/dashboard">
              Worker
            </Link>
            <Link className="shrink-0 rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/supervisor">
              Supervisor
            </Link>
            <Link className="shrink-0 rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/family/demo">
              Family
            </Link>
            <Link className="shrink-0 rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100" href="/admin/reset">
              Reset
            </Link>
            <RoleIndicator />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-[100vw] px-4 py-5 sm:px-6 md:py-7 lg:max-w-7xl">{children}</main>
    </div>
  );
}
