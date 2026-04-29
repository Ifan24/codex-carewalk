import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-left text-xs font-semibold whitespace-normal",
        tone === "neutral" && "border-stone-200 bg-stone-50 text-stone-700",
        tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "red" && "border-rose-200 bg-rose-50 text-rose-800",
        tone === "blue" && "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("min-w-0 rounded-lg border border-stone-200 bg-white/90 p-5 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 sm:text-sm">{eyebrow}</p> : null}
      <h1 className="w-full max-w-[calc(100vw-2rem)] break-words text-3xl font-semibold leading-tight tracking-normal text-stone-950 sm:max-w-3xl sm:text-4xl">
        {title}
      </h1>
      {children ? (
        <div className="w-full max-w-[calc(100vw-2rem)] break-words text-base leading-7 text-stone-600 sm:max-w-3xl sm:text-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function PrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={clsx(
        "inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800",
        className,
      )}
      href={href}
    >
      {children}
    </a>
  );
}
