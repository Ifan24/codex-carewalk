"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pause,
  Radio,
  Save,
  Square,
} from "lucide-react";
import type { LiveRayBanFrame, VisitSession } from "@/lib/schemas";
import { Badge } from "./ui";
import { SafeModePanel } from "./SafeModePanel";

function readSessionToken(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("event" in payload)) return "";
  const event = (payload as { event?: { payload?: Record<string, unknown> } }).event;
  const token = event?.payload?.sessionToken;
  return typeof token === "string" ? token : "";
}

function ageLabel(frame: LiveRayBanFrame | null, nowMs: number) {
  if (!frame) return "No frame yet";
  const seconds = Math.max(0, Math.round((nowMs - new Date(frame.receivedAt).getTime()) / 1000));
  if (seconds < 2) return "Live now";
  return `${seconds}s ago`;
}

const workerGlassesDemoVideoSrc = "/videos/worker-glasses-live-demo.mov";
const workerGlassesDemoPlaybackRate = 0.25;

export function RayBanLiveAssistPanel({ visit }: { visit: VisitSession }) {
  const router = useRouter();
  const lastConsent = visit.consentEvents.at(-1);
  const liveAllowed =
    lastConsent?.consentState === "granted" &&
    lastConsent.scope.includes("rayban_media") &&
    lastConsent.scope.includes("voice_note") &&
    (lastConsent.captureModesAllowed.includes("rayban_live_assist") ||
      (lastConsent.captureModesAllowed.includes("rayban_media_upload") &&
        lastConsent.captureModesAllowed.includes("voice_transcript")));
  const [latestFrame, setLatestFrame] = useState<LiveRayBanFrame | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  const frameUploadUrl = useMemo(() => `/api/visits/${visit.id}/worker-glasses/frame`, [visit.id]);
  const frameIsStale = latestFrame ? nowMs - new Date(latestFrame.receivedAt).getTime() > 5000 : true;

  const syncWorkerGlassesDemoRate = useCallback((video: HTMLVideoElement) => {
    video.defaultPlaybackRate = workerGlassesDemoPlaybackRate;
    video.playbackRate = workerGlassesDemoPlaybackRate;
  }, []);

  const setWorkerGlassesDemoVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      if (video) syncWorkerGlassesDemoRate(video);
    },
    [syncWorkerGlassesDemoRate],
  );

  const refreshFrame = useCallback(async () => {
    const response = await fetch(frameUploadUrl, { cache: "no-store" });
    const payload = await response.json();
    if (payload.ok) setLatestFrame(payload.frame);
  }, [frameUploadUrl]);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
      void refreshFrame();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [active, refreshFrame]);

  async function callLiveApi(path: "start" | "end", body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visit.id}/worker-glasses/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "worker_001", actorRole: "worker", ...body }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error);
      return payload;
    }
    return payload;
  }

  async function startLive() {
    const payload = await callLiveApi("start", {});
    const token = readSessionToken(payload);
    if (payload.ok) {
      setSessionToken(token);
      setActive(true);
      setNowMs(Date.now());
      setMessage("Worker Glasses session ready.");
      void refreshFrame();
    }
  }

  async function saveSnapshot() {
    if (!sessionToken || !latestFrame) {
      setMessage("Start live and wait for a Worker Glasses frame before saving.");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/visits/${visit.id}/worker-glasses/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: "worker_001",
        actorRole: "worker",
        sessionToken,
        frameId: latestFrame.frameId,
        captureContext: latestFrame.captureContext,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }
    setMessage("Snapshot saved for review.");
    router.refresh();
  }

  async function endLive() {
    const payload = await callLiveApi("end", {});
    if (payload.ok) {
      setActive(false);
      setSessionToken("");
      setMessage(`${payload.observations.length} live observation(s) saved for review.`);
      router.refresh();
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Live view</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-stone-950">
            <Radio className="h-5 w-5" /> Worker Glasses live view
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={liveAllowed ? "green" : "amber"}>{liveAllowed ? "Live consent on" : "Live blocked"}</Badge>
          <Badge tone={active ? "green" : "neutral"}>{active ? "Bridge active" : "Standby"}</Badge>
          <Badge tone={latestFrame && !frameIsStale ? "green" : "amber"}>{ageLabel(latestFrame, nowMs)}</Badge>
        </div>
      </div>

      {!liveAllowed ? <SafeModePanel reasons={["Worker Glasses requires media and voice note consent"]} /> : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4 xl:col-span-2">
          <div className="overflow-hidden rounded-lg border border-stone-900 bg-stone-950">
            <div className="relative aspect-video w-full">
              {latestFrame ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latestFrame.dataUrl} alt="Live Worker Glasses frame" className="h-full w-full object-cover" />
              ) : (
                <video
                  ref={setWorkerGlassesDemoVideo}
                  src={workerGlassesDemoVideoSrc}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  onLoadedMetadata={(event) => syncWorkerGlassesDemoRate(event.currentTarget)}
                  onPlay={(event) => syncWorkerGlassesDemoRate(event.currentTarget)}
                  playsInline
                  preload="auto"
                  aria-label="Worker Glasses demo feed"
                />
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              disabled={!liveAllowed || busy || active}
              onClick={startLive}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              Pause Recording
            </button>
            <button
              type="button"
              disabled={!liveAllowed || busy || !latestFrame || !sessionToken}
              onClick={saveSnapshot}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save snapshot
            </button>
            <button
              type="button"
              disabled={!liveAllowed || busy}
              onClick={endLive}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              End session
            </button>
          </div>
          {message ? <p className="rounded-md bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-800">{message}</p> : null}
        </div>
      </div>
    </section>
  );
}
