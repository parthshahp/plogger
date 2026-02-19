"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { TagPill } from "@/components/entries/tag-pill";
import { db, type Entry, type Tag } from "@/lib/db";
import { formatDuration } from "@/lib/time";

const PAGE_SIZE = 50;

type ListRow =
  | { type: "day"; key: string; label: string }
  | { type: "entry"; key: string; entry: Entry }
  | { type: "loader"; key: string };

export function EntriesListView({
  now,
  tagMap,
  revisionToken,
  onEdit,
  onDelete,
}: {
  now: number;
  tagMap: Map<string, Tag>;
  revisionToken: string;
  onEdit: (entry: Entry) => void;
  onDelete: (entryId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const loadingRef = useRef(false);

  const entries = useLiveQuery(
    () =>
      db.entries
        .orderBy("startAt")
        .reverse()
        .filter((entry) => !entry.deletedAt)
        .limit(page * PAGE_SIZE)
        .toArray(),
    [page, revisionToken]
  );

  useEffect(() => {
    loadingRef.current = false;
  }, [entries?.length]);

  const hasMore = useMemo(() => {
    if (!entries) return false;
    return entries.length >= page * PAGE_SIZE;
  }, [entries, page]);

  const rows = useMemo<ListRow[]>(() => {
    if (!entries) return [];

    const builtRows: ListRow[] = [];
    let previousDayKey: string | null = null;

    for (const entry of entries) {
      const dayKey = getDayKey(entry.startAt);
      if (dayKey !== previousDayKey) {
        builtRows.push({
          type: "day",
          key: `day-${dayKey}`,
          label: formatDayHeader(entry.startAt),
        });
        previousDayKey = dayKey;
      }

      builtRows.push({
        type: "entry",
        key: `entry-${entry.id}`,
        entry,
      });
    }

    if (hasMore) {
      builtRows.push({ type: "loader", key: "loader" });
    }

    return builtRows;
  }, [entries, hasMore]);

  useEffect(() => {
    if (!entries || entries.length === 0 || !hasMore) return;

    const maybeLoadMore = () => {
      if (loadingRef.current) return;
      const doc = document.documentElement;
      const distanceToBottom = doc.scrollHeight - (window.scrollY + window.innerHeight);
      if (distanceToBottom <= 600) {
        loadingRef.current = true;
        setPage((prev) => prev + 1);
      }
    };

    maybeLoadMore();
    window.addEventListener("scroll", maybeLoadMore, { passive: true });
    window.addEventListener("resize", maybeLoadMore);

    return () => {
      window.removeEventListener("scroll", maybeLoadMore);
      window.removeEventListener("resize", maybeLoadMore);
    };
  }, [entries, hasMore]);

  useEffect(() => {
    if (!hasMore) {
      loadingRef.current = false;
    }
  }, [hasMore]);

  if (!entries) {
    return <div className="rounded-lg border border-dashed p-8 text-muted-foreground">Loading entries...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-muted-foreground">
        No entries yet. Start a timer from the Dashboard page.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recent entries</h2>
      <div>
        {rows.map((row) => {
          if (row.type === "loader") {
            return (
              <div key={row.key} className="px-4 py-6 text-sm text-muted-foreground">
                Loading more entries...
              </div>
            );
          }

          if (row.type === "day") {
            return (
              <div key={row.key} className="px-1 pb-1 pt-7 text-sm font-semibold text-muted-foreground">
                {row.label}
              </div>
            );
          }

          return (
            <div key={row.key} className="mb-2 rounded-md border-b bg-muted/30 px-4 py-3 last:border-b-0">
              <EntryRow
                entry={row.entry}
                tagMap={tagMap}
                onDelete={onDelete}
                onEdit={() => onEdit(row.entry)}
                now={now}
              />
            </div>
          );
        })}
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
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold">{entry.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatTime(entry.startAt)}
            {" -> "}
            {entry.endAt ? formatTime(entry.endAt) : "running"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 && (
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                Untagged
              </span>
            )}
            {tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-lg font-semibold">{formatDuration(durationSec)}</p>
          <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onDelete(entry.id)}
            >
              {entry.endAt ? "Delete" : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDayKey(ts: number) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayHeader(ts: number) {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
