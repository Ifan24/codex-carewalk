"use client";

import { useState } from "react";

export function AdminReset() {
  const [message, setMessage] = useState("");
  async function reset() {
    const response = await fetch("/api/demo/reset", { method: "POST" });
    const payload = await response.json();
    setMessage(payload.ok ? "Visit data reset." : "Reset failed.");
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-stone-950">Reset visit data</h2>
      <p className="mt-1 text-sm text-stone-600">Restores Maggie, users, visit state, audit seed, and empty outputs.</p>
      <button onClick={reset} className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
        Reset
      </button>
      {message ? <p className="mt-3 text-sm font-semibold text-teal-800">{message}</p> : null}
    </div>
  );
}
