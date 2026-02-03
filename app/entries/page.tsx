"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Entry, type Tag } from "@/lib/db";
import {
  deleteEntry,
  startTimer,
  stopTimer,
  updateEntry,
  updateRunningEntry,
} from "@/lib/data";
import { formatDuration, formatTimestamp } from "@/lib/time";

function buildTagMap(tags: Tag[]) {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

export default function EntriesPage() {
  const [, startTransition] = useTransition();
  const now = useNow(1000);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const tags = useLiveQuery(() =>
    db.tags.orderBy("name").filter((tag) => !tag.deletedAt).toArray()
  );

  const activeEntry = useLiveQuery(() =>
    db.entries
      .filter((entry) => entry.endAt === null && !entry.deletedAt)
      .first()
  );

  const entries = useLiveQuery(() =>
    db.entries
      .orderBy("startAt")
      .reverse()
      .filter((entry) => !entry.deletedAt)
      .toArray()
  );

  const tagMap = useMemo(() => buildTagMap(tags ?? []), [tags]);

  const onDelete = (entryId: string) => {
    startTransition(() => {
      void deleteEntry(entryId);
    });
  };

  const onStart = async (payload: { description: string; tagIds: string[] }) => {
    await startTimer(payload);
  };

  const onEdit = (entry: Entry) => {
    setEditingEntry(entry);
  };

  const onSaveEdit = async (payload: {
    id: string;
    description: string;
    tagIds: string[];
    isRunning: boolean;
  }) => {
    if (payload.isRunning) {
      await updateRunningEntry({
        id: payload.id,
        description: payload.description,
        tagIds: payload.tagIds,
      });
    } else {
      await updateEntry({
        id: payload.id,
        description: payload.description,
        tagIds: payload.tagIds,
      });
    }
    setEditingEntry(null);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold">Entries</h1>
        <p className="mt-2 text-slate-300">
          Run a single timer at a time and keep notes as you go.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {activeEntry ? (
            <RunningTimerCard
              entry={activeEntry}
              tagMap={tagMap}
              now={now}
              onEdit={() => onEdit(activeEntry)}
              onStop={() => stopTimer(activeEntry.id)}
            />
          ) : (
            <StartTimerCard onStart={() => setIsStartOpen(true)} />
          )}
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <p className="mt-2 text-sm text-slate-400">
            Start tracking a new task or keep the timer running while you edit
            details.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsStartOpen(true)}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Start timer
            </button>
            {activeEntry ? (
              <button
                type="button"
                onClick={() => onEdit(activeEntry)}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
              >
                Edit running entry
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent entries</h2>
        {(entries ?? []).length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-slate-400">
            No entries yet. Start a timer to create your first entry.
          </div>
        )}
        {(entries ?? []).map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            tagMap={tagMap}
            onDelete={onDelete}
            onEdit={() => onEdit(entry)}
            now={now}
          />
        ))}
      </div>

      {isStartOpen ? (
        <EntryFormModal
          key="start"
          title="Start a timer"
          submitLabel="Start timer"
          tags={tags ?? []}
          onClose={() => setIsStartOpen(false)}
          onSubmit={async (payload) => {
            await onStart(payload);
            setIsStartOpen(false);
          }}
        />
      ) : null}

      {editingEntry ? (
        <EntryFormModal
          key={editingEntry.id}
          title={editingEntry.endAt ? "Edit entry" : "Edit running entry"}
          submitLabel="Save changes"
          tags={tags ?? []}
          initialDescription={editingEntry.description}
          initialTagIds={editingEntry.tagIds}
          onClose={() => setEditingEntry(null)}
          onSubmit={async (payload) => {
            await onSaveEdit({
              id: editingEntry.id,
              description: payload.description,
              tagIds: payload.tagIds,
              isRunning: editingEntry.endAt === null,
            });
          }}
        />
      ) : null}
    </section>
  );
}

function StartTimerCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
      <p className="text-sm text-slate-400">No timer running</p>
      <h2 className="mt-2 text-xl font-semibold">Ready to start tracking?</h2>
      <p className="mt-2 text-sm text-slate-400">
        Start a timer to log focused work sessions and keep them organized.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
      >
        Start timer
      </button>
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
    <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
      <p className="text-sm text-emerald-200">Running</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-slate-100">
            {entry.description}
          </p>
          <p className="mt-1 text-xs text-emerald-100/80">
            Started {formatTimestamp(entry.startAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <span className="rounded-full border border-emerald-200/40 px-3 py-1 text-xs text-emerald-100">
                Untagged
              </span>
            ) : (
              tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} tone="emerald" />
              ))
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-emerald-100">
            {formatDuration(durationSec)}
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-emerald-200/60 px-3 py-1 text-xs text-emerald-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onStop}
              className="rounded-full border border-rose-300/60 px-3 py-1 text-xs text-rose-100"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  tagMap,
  onDelete,
  onEdit,
  now,
}: {
  entry: Entry;
  tagMap: Map<string, Tag>;
  onDelete: (entryId: string) => void;
  onEdit: () => void;
  now: number;
}) {
  const durationSec = entry.endAt
    ? entry.durationSec ?? 0
    : Math.max(0, Math.floor((now - entry.startAt) / 1000));
  const tags = entry.tagIds.map((id) => tagMap.get(id)).filter(Boolean) as Tag[];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-100">
            {entry.description}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatTimestamp(entry.startAt)}
            {entry.endAt ? ` → ${formatTimestamp(entry.endAt)}` : " (running)"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 && (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                Untagged
              </span>
            )}
            {tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} tone="slate" />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-100">
            {formatDuration(durationSec)}
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="text-xs text-slate-200 hover:text-white"
              onClick={onEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-xs text-rose-200 hover:text-rose-100"
              onClick={() => onDelete(entry.id)}
            >
              {entry.endAt ? "Delete" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagPill({ tag, tone }: { tag: Tag; tone: "slate" | "emerald" }) {
  const baseTone =
    tone === "emerald"
      ? "border-emerald-200/40 text-emerald-100"
      : "border-slate-700 text-slate-300";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${baseTone}`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tag.color || "#64748b" }}
      />
      {tag.name}
    </span>
  );
}

function EntryFormModal({
  title,
  submitLabel,
  tags,
  initialDescription = "",
  initialTagIds = [],
  onSubmit,
  onClose,
}: {
  title: string;
  submitLabel: string;
  tags: Tag[];
  initialDescription?: string;
  initialTagIds?: string[];
  onSubmit: (payload: { description: string; tagIds: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTagIds);
  const [isSaving, setIsSaving] = useState(false);

  const onToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const onSubmitForm = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await onSubmit({ description, tagIds: selectedTags });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add context and optional tags while the timer runs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div>
            <label className="text-xs uppercase text-slate-500">Description</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-500"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you working on?"
            />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length === 0 && (
                <span className="text-sm text-slate-500">
                  Add tags in the Tags page.
                </span>
              )}
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selectedTags.includes(tag.id)
                      ? "border-slate-200 bg-slate-200 text-slate-900"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                  onClick={() => onToggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitForm}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            {isSaving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
