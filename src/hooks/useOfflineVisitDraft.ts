"use client";

import { useEffect, useMemo, useState } from "react";

export type OfflineDraft = {
  rawNote: string;
  voiceTranscript: string;
  checklist: Record<string, boolean>;
};

export type SyncStatus = "local_only" | "syncing" | "synced" | "sync_failed";

const emptyDraft: OfflineDraft = {
  rawNote: "",
  voiceTranscript: "",
  checklist: {},
};

export function useOfflineVisitDraft(visitId: string) {
  const key = useMemo(() => `carewalk_draft_${visitId}`, [visitId]);
  const [draft, setDraft] = useState<OfflineDraft>(emptyDraft);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = localStorage.getItem(key);
      if (stored) {
        setDraft(JSON.parse(stored) as OfflineDraft);
        setSyncStatus("local_only");
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [key]);

  function saveDraft(nextDraft: OfflineDraft) {
    setDraft(nextDraft);
    localStorage.setItem(key, JSON.stringify(nextDraft));
    setSyncStatus("local_only");
  }

  function clearDraft() {
    localStorage.removeItem(key);
    setDraft(emptyDraft);
    setSyncStatus("synced");
  }

  function markSyncing() {
    setSyncStatus("syncing");
  }

  function markSynced() {
    localStorage.removeItem(key);
    setSyncStatus("synced");
  }

  function markSyncFailed() {
    setSyncStatus("sync_failed");
  }

  return {
    draft,
    syncStatus,
    saveDraft,
    clearDraft,
    markSyncing,
    markSynced,
    markSyncFailed,
  };
}
