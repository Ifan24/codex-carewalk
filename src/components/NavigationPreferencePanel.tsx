"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MapPinned, Navigation } from "lucide-react";
import type { ClientProfile, NavigationPreference } from "@/lib/schemas";
import { Badge } from "./ui";

const preferenceLabels: Record<NavigationPreference, string> = {
  apple_maps: "Apple Maps",
  google_maps: "Google Maps",
  waze: "Waze",
};

type DemoUser = {
  id: string;
  displayName: string;
  role: string;
  navigationPreference?: NavigationPreference;
};

function addressLine(client: ClientProfile) {
  return `${client.address.line1}, ${client.address.suburb} ${client.address.state} ${client.address.postcode}, ${client.address.country}`;
}

function navigationLinks(destination: string) {
  const encoded = encodeURIComponent(destination);
  return {
    apple_maps: `https://maps.apple.com/?daddr=${encoded}`,
    google_maps: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    waze: `https://waze.com/ul?q=${encoded}&navigate=yes`,
  } satisfies Record<NavigationPreference, string>;
}

function readStoredUser() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("carewalk_user");
  return stored ? (JSON.parse(stored) as DemoUser) : null;
}

export function NavigationPreferencePanel({ client }: { client: ClientProfile }) {
  const [user, setUser] = useState<DemoUser | null>(() => readStoredUser());
  const [preference, setPreference] = useState<NavigationPreference>(() => readStoredUser()?.navigationPreference ?? "apple_maps");
  const [message, setMessage] = useState("");
  const destination = addressLine(client);
  const links = useMemo(() => navigationLinks(destination), [destination]);

  async function savePreference(nextPreference: NavigationPreference) {
    setPreference(nextPreference);
    setMessage("");
    if (!user?.id) {
      setMessage("Navigation preference saved locally for this device.");
      return;
    }
    const response = await fetch(`/api/users/${user.id}/navigation-preference`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ navigationPreference: nextPreference }),
    });
    const payload = await response.json();
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    const updatedUser = { ...user, navigationPreference: nextPreference };
    setUser(updatedUser);
    localStorage.setItem("carewalk_user", JSON.stringify(updatedUser));
    setMessage(`Preference saved: ${preferenceLabels[nextPreference]}.`);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">Navigation</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-stone-950">
            <MapPinned className="h-5 w-5" /> Head to {client.preferredName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{destination}</p>
        </div>
        <Badge tone="blue">{preferenceLabels[preference]}</Badge>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Preferred navigation app</span>
        <select
          value={preference}
          onChange={(event) => void savePreference(event.target.value as NavigationPreference)}
          className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
        >
          {Object.entries(preferenceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <a
          href={links[preference]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          <Navigation className="h-4 w-4" />
          Navigate
        </a>
        {Object.entries(links).map(([key, href]) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800"
          >
            <ExternalLink className="h-4 w-4" />
            {preferenceLabels[key as NavigationPreference]}
          </a>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-stone-700">{message}</p> : null}
    </section>
  );
}
