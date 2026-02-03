"use client";

import { useEffect, useRef } from "react";
import { syncNow } from "@/lib/sync";

const SYNC_INTERVAL_MS = 60_000;

export default function SyncClient() {
  const syncingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const runSync = async () => {
      if (!mounted || syncingRef.current || !navigator.onLine) {
        return;
      }
      syncingRef.current = true;
      try {
        await syncNow();
      } finally {
        syncingRef.current = false;
      }
    };

    void runSync();

    const intervalId = window.setInterval(runSync, SYNC_INTERVAL_MS);
    const handleOnline = () => void runSync();

    window.addEventListener("online", handleOnline);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
