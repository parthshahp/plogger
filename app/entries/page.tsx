"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EntriesListView } from "@/components/entries/entries-list-view";
import {
  EntriesViewToggle,
  type EntriesView,
} from "@/components/entries/entries-view-toggle";
import { EntriesWeekCalendarView } from "@/components/entries/entries-week-calendar-view";
import { EntryFormModal } from "@/components/entries/entry-form-modal";
import { db, type Entry, type Tag } from "@/lib/db";
import {
  createEntryFromRange,
  deleteEntry,
  updateEntry,
  updateRunningEntry,
} from "@/lib/data";

const ENTRIES_VIEW_STORAGE_KEY = "plogger:entries:view";

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

function parseView(value: string | null): EntriesView {
  return value === "week" ? "week" : "list";
}

export default function EntriesPage() {
  const [, startTransition] = useTransition();
  const now = useNow(1000);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [creatingRange, setCreatingRange] = useState<{
    startAt: number;
    endAt: number;
  } | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const view = parseView(searchParams.get("view"));

  const tags = useLiveQuery(() =>
    db.tags.orderBy("name").filter((tag) => !tag.deletedAt).toArray()
  );

  const entriesRevision = useLiveQuery(async () => {
    const [count, latest] = await Promise.all([
      db.entries.filter((entry) => !entry.deletedAt).count(),
      db.entries.orderBy("updatedAt").last(),
    ]);

    return `${count}-${latest?.updatedAt ?? 0}`;
  }, []);

  const tagMap = useMemo(() => buildTagMap(tags ?? []), [tags]);

  const setView = useCallback((nextView: EntriesView) => {
    window.localStorage.setItem(ENTRIES_VIEW_STORAGE_KEY, nextView);

    const params = new URLSearchParams(searchParams.toString());

    if (nextView === "list") {
      params.delete("view");
    } else {
      params.set("view", nextView);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("view")) return;

    const saved = window.localStorage.getItem(ENTRIES_VIEW_STORAGE_KEY);
    if (saved === "week") {
      setView("week");
    }
  }, [searchParams, setView]);

  const onDelete = (entryId: string) => {
    startTransition(() => {
      void deleteEntry(entryId);
    });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Entries</h1>
          <p className="text-muted-foreground">
            Review, edit, and organize your tracked sessions.
          </p>
        </div>
        <EntriesViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <EntriesListView
          now={now}
          tagMap={tagMap}
          revisionToken={entriesRevision ?? "loading"}
          onEdit={setEditingEntry}
          onDelete={onDelete}
        />
      ) : (
        <div className="relative left-1/2 w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] -translate-x-1/2">
          <EntriesWeekCalendarView
            now={now}
            tagMap={tagMap}
            onEdit={setEditingEntry}
            onCreateRange={(range) => {
              setEditingEntry(null);
              setCreatingRange(range);
            }}
          />
        </div>
      )}

      {creatingRange ? (
        <EntryFormModal
          title="Create entry"
          subtitle="Add context and optional tags for this selected time block."
          submitLabel="Create entry"
          tags={tags ?? []}
          onClose={() => setCreatingRange(null)}
          onSubmit={async (payload) => {
            await createEntryFromRange({
              ...creatingRange,
              description: payload.description,
              tagIds: payload.tagIds,
            });
            setCreatingRange(null);
          }}
        />
      ) : null}

      {editingEntry ? (
        <EntryFormModal
          key={editingEntry.id}
          title={editingEntry.endAt ? "Edit entry" : "Edit running entry"}
          submitLabel="Save changes"
          dangerLabel={editingEntry.endAt ? "Delete entry" : "Delete running entry"}
          tags={tags ?? []}
          initialDescription={editingEntry.description}
          initialTagIds={editingEntry.tagIds}
          onClose={() => setEditingEntry(null)}
          onDanger={async () => {
            await deleteEntry(editingEntry.id);
            setEditingEntry(null);
          }}
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
