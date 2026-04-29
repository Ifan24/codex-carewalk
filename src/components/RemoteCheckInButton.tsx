"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall } from "lucide-react";

export function RemoteCheckInButton({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function createTask() {
    const response = await fetch(`/api/visits/${visitId}/remote-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "supervisor_001", actorRole: "supervisor" }),
    });
    const payload = await response.json();
    if (!payload.ok) setMessage(payload.error);
    else {
      setMessage("Remote check-in created.");
      router.refresh();
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={createTask}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
      >
        <PhoneCall className="h-4 w-4" />
        Create remote check-in
      </button>
      {message ? <p className="mt-2 text-sm font-semibold text-stone-800">{message}</p> : null}
    </div>
  );
}
