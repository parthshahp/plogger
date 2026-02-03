"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Entry, type Tag } from "@/lib/db";
import { formatDuration } from "@/lib/time";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, fallback: Date) {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return new Date(year, month - 1, day);
}

function sumDurations(entries: Entry[]) {
  return entries.reduce((sum, entry) => sum + (entry.durationSec ?? 0), 0);
}

function buildTagMap(tags: Tag[]) {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

function buildTagTotals(entries: Entry[]) {
  const totals = new Map<string, number>();

  entries.forEach((entry) => {
    const duration = entry.durationSec ?? 0;
    if (entry.tagIds.length === 0) {
      totals.set("untagged", (totals.get("untagged") ?? 0) + duration);
      return;
    }
    entry.tagIds.forEach((tagId) => {
      totals.set(tagId, (totals.get(tagId) ?? 0) + duration);
    });
  });

  return totals;
}

export default function ReportPage() {
  const today = startOfDay(new Date());
  const sevenDaysAgo = new Date(today.getTime() - 6 * DAY_MS);

  const [rangeStart, setRangeStart] = useState(formatDateInput(sevenDaysAgo));
  const [rangeEnd, setRangeEnd] = useState(formatDateInput(today));

  const tags = useLiveQuery(() =>
    db.tags.orderBy("name").filter((tag) => !tag.deletedAt).toArray()
  );

  const tagMap = useMemo(() => buildTagMap(tags ?? []), [tags]);

  const todayEntries = useLiveQuery(() => {
    const start = today.getTime();
    const end = endOfDay(today).getTime();
    return db.entries
      .where("startAt")
      .between(start, end, true, true)
      .filter((entry: Entry) => !entry.deletedAt && entry.endAt !== null)
      .toArray();
  }, [today.getTime()]);

  const sevenDayEntries = useLiveQuery(() => {
    const start = sevenDaysAgo.getTime();
    const end = endOfDay(today).getTime();
    return db.entries
      .where("startAt")
      .between(start, end, true, true)
      .filter((entry: Entry) => !entry.deletedAt && entry.endAt !== null)
      .toArray();
  }, [sevenDaysAgo.getTime(), today.getTime()]);

  const rangeEntries = useLiveQuery(() => {
    const startDate = parseDateInput(rangeStart, sevenDaysAgo);
    const endDate = parseDateInput(rangeEnd, today);
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();
    const [rangeStartMs, rangeEndMs] = start <= end ? [start, end] : [end, start];

    return db.entries
      .where("startAt")
      .between(rangeStartMs, rangeEndMs, true, true)
      .filter((entry: Entry) => !entry.deletedAt && entry.endAt !== null)
      .toArray();
  }, [rangeStart, rangeEnd]);

  const todayTotal = useMemo(
    () => formatDuration(sumDurations(todayEntries ?? [])),
    [todayEntries]
  );

  const sevenDayTotal = useMemo(
    () => formatDuration(sumDurations(sevenDayEntries ?? [])),
    [sevenDayEntries]
  );

  const rangeTotalSeconds = useMemo(
    () => sumDurations(rangeEntries ?? []),
    [rangeEntries]
  );

  const tagTotals = useMemo(() => {
    const totals = buildTagTotals(rangeEntries ?? []);
    return [...totals.entries()]
      .map(([tagId, duration]) => {
        if (tagId === "untagged") {
          return { id: tagId, label: "Untagged", duration };
        }
        const tag = tagMap.get(tagId);
        return {
          id: tagId,
          label: tag?.name ?? "Unknown",
          color: tag?.color,
          duration,
        };
      })
      .sort((a, b) => b.duration - a.duration);
  }, [rangeEntries, tagMap]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold">Report</h1>
        <p className="mt-2 text-slate-300">
          Totals by tag, plus today and rolling seven-day summaries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Today" value={todayTotal} />
        <SummaryCard label="Last 7 days" value={sevenDayTotal} />
        <SummaryCard
          label="Selected range"
          value={formatDuration(rangeTotalSeconds)}
        />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold">Date range</h2>
        <p className="mt-2 text-sm text-slate-400">
          Pick a range to see totals by tag.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-slate-500">Start</label>
            <input
              type="date"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-500"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">End</label>
            <input
              type="date"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-500"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold">Totals by tag</h2>
        {(tagTotals.length === 0 && rangeEntries && rangeEntries.length === 0) ? (
          <p className="mt-4 text-sm text-slate-400">No entries in this range.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {tagTotals.map((tag) => (
              <div
                key={tag.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color || "#64748b" }}
                  />
                  <p className="text-sm font-medium text-slate-100">
                    {tag.label}
                  </p>
                </div>
                <p className="text-sm text-slate-200">
                  {formatDuration(tag.duration)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
