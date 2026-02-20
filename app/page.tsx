"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import EntriesWorkspace from "@/components/entries/entries-workspace";
import { EntryFormModal } from "@/components/entries/entry-form-modal";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { db, type Entry, type Tag } from "@/lib/db";
import { SHORTCUTS } from "@/lib/shortcuts";
import { createEntryWithTimes, stopTimer, updateRunningEntry } from "@/lib/data";
import { formatDuration, formatTimestamp } from "@/lib/time";

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

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

function buildTagMap(tags: Tag[]) {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

export default function Home() {
  const now = useNow(1000);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const tags = useLiveQuery(() =>
    db.tags.orderBy("name").filter((tag) => !tag.deletedAt).toArray()
  );

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

  const tagMap = useMemo(() => buildTagMap(tags ?? []), [tags]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          ...SHORTCUTS.openStartTimer,
          onKeyDown: () => {
            setIsEditOpen(false);
            setIsStartOpen(true);
          },
        },
      ],
      []
    )
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          {activeEntry ? (
            <RunningTimerCard
              entry={activeEntry}
              tagMap={tagMap}
              now={now}
              onEdit={() => setIsEditOpen(true)}
              onStop={() => stopTimer(activeEntry.id)}
            />
          ) : (
            <StartTimerCard onStart={() => setIsStartOpen(true)} />
          )}
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="mt-2 text-lg font-semibold">
            {formatDuration(todayTotal ?? 0)} logged
          </p>
        </div>
      </div>

      {isStartOpen ? (
        <EntryFormModal
          title="Start a timer"
          subtitle="Add context and optional tags before starting this timer."
          submitLabel="Start timer"
          showTimeFields
          initialStartAt={now}
          initialEndAt={null}
          tags={tags ?? []}
          onClose={() => setIsStartOpen(false)}
          onSubmit={async (payload) => {
            await createEntryWithTimes({
              description: payload.description,
              tagIds: payload.tagIds,
              startAt: payload.startAt,
              endAt: payload.endAt,
            });
            setIsStartOpen(false);
          }}
        />
      ) : null}

      {isEditOpen && activeEntry ? (
        <EntryFormModal
          title="Edit running entry"
          subtitle="Update details for the currently running timer."
          submitLabel="Save changes"
          tags={tags ?? []}
          initialDescription={activeEntry.description}
          initialTagIds={activeEntry.tagIds}
          onClose={() => setIsEditOpen(false)}
          onSubmit={async (payload) => {
            await updateRunningEntry({
              id: activeEntry.id,
              description: payload.description,
              tagIds: payload.tagIds,
            });
            setIsEditOpen(false);
          }}
        />
      ) : null}

      <EntriesWorkspace now={now} />
    </section>
  );
}

function StartTimerCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">No timer running</p>
      <h2 className="mt-2 text-xl font-semibold">Ready to start tracking?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Start a timer to log focused work sessions and keep them organized.
      </p>
      <Button type="button" onClick={onStart} className="mt-6">
        Start timer
      </Button>
    </div>
  );
}

function RunningTimerCard({
  entry,
  tagMap,
  now,
  onEdit,
  onStop,
}: {
  entry: Entry;
  tagMap: Map<string, Tag>;
  now: number;
  onEdit: () => void;
  onStop: () => void;
}) {
  const durationSec = Math.max(0, Math.floor((now - entry.startAt) / 1000));
  const tags = entry.tagIds.map((id) => tagMap.get(id)).filter(Boolean) as Tag[];

  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">Running</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold">{entry.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Started {formatTimestamp(entry.startAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <span className="rounded-full border px-3 py-1 text-xs">Untagged</span>
            ) : (
              tags.map((tag) => <TagPill key={tag.id} tag={tag} />)
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{formatDuration(durationSec)}</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onStop}>
              Stop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tag.color || "#64748b" }}
      />
      {tag.name}
    </span>
  );
}
