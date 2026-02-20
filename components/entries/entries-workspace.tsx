"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
  createEntryWithTimes,
  deleteEntry,
  updateEntry,
  updateRunningEntry,
} from "@/lib/data";

function buildTagMap(tags: Tag[]) {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

function parseView(value: string | null): EntriesView {
  return value === "week" ? "week" : "list";
}

function parseWeekOffset(value: string | null) {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export default function EntriesWorkspace({ now }: { now: number }) {
  const [, startTransition] = useTransition();
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [creatingRange, setCreatingRange] = useState<{
    startAt: number;
    endAt: number;
  } | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const view = parseView(searchParams.get("view"));
  const weekOffset = parseWeekOffset(searchParams.get("weekOffset"));

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

  const setView = useCallback(
    (nextView: EntriesView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextView);
      if (nextView !== "week") {
        params.delete("weekOffset");
      } else if (!params.get("weekOffset")) {
        params.set("weekOffset", "0");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const setWeekOffset = useCallback(
    (nextOffset: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "week");
      params.set("weekOffset", `${nextOffset}`);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

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
      <div className="flex justify-end">
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
        <div className="relative left-1/2 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 md:w-[calc(100vw-17rem)] md:max-w-[calc(100vw-17rem)]">
          <EntriesWeekCalendarView
            now={now}
            weekOffset={weekOffset}
            tagMap={tagMap}
            onEdit={setEditingEntry}
            onPrevWeek={() => setWeekOffset(weekOffset - 1)}
            onNextWeek={() => setWeekOffset(weekOffset + 1)}
            onCurrentWeek={() => setWeekOffset(0)}
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
          showTimeFields
          requireEndAt
          initialStartAt={creatingRange.startAt}
          initialEndAt={creatingRange.endAt}
          tags={tags ?? []}
          onClose={() => setCreatingRange(null)}
          onSubmit={async (payload) => {
            await createEntryWithTimes({
              description: payload.description,
              tagIds: payload.tagIds,
              startAt: payload.startAt,
              endAt: payload.endAt,
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
