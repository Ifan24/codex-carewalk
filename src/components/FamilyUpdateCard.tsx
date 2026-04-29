"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui";

type FamilyUpdateCardProps = {
  title: string;
  body: string;
  statusLabel: string;
};

export function FamilyUpdateCard({ title, body, statusLabel }: FamilyUpdateCardProps) {
  const [sent, setSent] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-stone-950">{title}</h2>
        <Badge tone={sent ? "green" : "amber"}>{sent ? "Sent" : statusLabel}</Badge>
      </div>
      <p className="max-w-3xl text-lg leading-8 text-stone-700">{body}</p>
      <button
        type="button"
        onClick={() => setSent(true)}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white"
      >
        <Send className="h-4 w-4" />
        Send
      </button>
      {sent ? <p className="mt-3 text-sm font-semibold text-teal-800">Update ready for Grace.</p> : null}
    </>
  );
}
