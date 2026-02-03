"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/time";

function getTodayRange() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  return { start: start.getTime(), end: end.getTime() };
}

export default function Home() {
  const activeEntry = useLiveQuery(() =>
    db.entries
      .filter((entry) => entry.endAt === null && !entry.deletedAt)
      .first()
  );

  const todayTotal = useLiveQuery(async () => {
    const { start, end } = getTodayRange();
    const entries = await db.entries
      .where("startAt")
      .between(start, end, true, true)
      .and((entry) => !entry.deletedAt && entry.endAt !== null)
      .toArray();
    return entries.reduce((sum, entry) => sum + (entry.durationSec || 0), 0);
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-slate-300">
          Your local-first time tracker. Start a timer, assign optional tags,
          and keep moving even when offline.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-400">Active Timer</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {activeEntry ? activeEntry.description : "No timer running."}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {activeEntry
              ? "Head to Entries to edit or stop it."
              : "Start one from the Entries page."}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-400">Today</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {formatDuration(todayTotal ?? 0)} logged
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Reports arrive in Milestone 4.
          </p>
        </div>
      </div>
    </section>
  );
}
