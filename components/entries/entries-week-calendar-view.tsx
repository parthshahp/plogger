"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db, type Entry, type Tag } from "@/lib/db";
import { formatDuration } from "@/lib/time";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_HEIGHT = 64;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const TIMELINE_GUTTER = 20;
const DISPLAY_SNAP_MINUTES = 15;
const DISPLAY_SNAP_MS = DISPLAY_SNAP_MINUTES * 60 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type RawSegment = {
  entry: Entry;
  dayIndex: number;
  actualStartMs: number;
  actualEndMs: number;
};

type PositionedSegment = RawSegment & {
  lane: number;
  laneCount: number;
  displayStartMs: number;
  displayEndMs: number;
};

type DisplaySegment = RawSegment & {
  displayStartMs: number;
  displayEndMs: number;
};

type DragState = {
  pointerId: number;
  dayIndex: number;
  dayStartMs: number;
  dayEndMs: number;
  anchorMs: number;
  currentMs: number;
  initialClientY: number;
};

export function EntriesWeekCalendarView({
  now,
  weekOffset,
  tagMap,
  onEdit,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onCreateRange,
}: {
  now: number;
  weekOffset: number;
  tagMap: Map<string, Tag>;
  onEdit: (entry: Entry) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onCreateRange: (payload: { startAt: number; endAt: number }) => void;
}) {
  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return startOfWeekSunday(base);
  }, [weekOffset]);
  const weekStartMs = weekStart.getTime();
  const weekEndExclusiveMs = weekStartMs + 7 * DAY_MS;
  const [dragState, setDragState] = useState<DragState | null>(null);

  const entries = useLiveQuery(
    () =>
      db.entries
        .where("startAt")
        .belowOrEqual(weekEndExclusiveMs)
        .filter((entry) => {
          if (entry.deletedAt) return false;
          const entryEnd = entry.endAt ?? now;
          return entryEnd >= weekStartMs;
        })
        .toArray(),
    [weekStartMs, weekEndExclusiveMs]
  );

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStartMs + index * DAY_MS);
        return {
          index,
          date,
          label: `${DAY_NAMES[index]} ${date.getMonth() + 1}/${date.getDate()}`,
        };
      }),
    [weekStartMs]
  );
  const weekLabel = `${formatCalendarDate(days[0].date)} - ${formatCalendarDate(
    days[6].date
  )}`;

  const segmentsByDay = useMemo(() => {
    const buckets: RawSegment[][] = Array.from({ length: 7 }, () => []);

    for (const entry of entries ?? []) {
      const effectiveEndMs = entry.endAt ?? now;
      const clippedStartMs = Math.max(entry.startAt, weekStartMs);
      const clippedEndMs = Math.min(effectiveEndMs, weekEndExclusiveMs);

      if (clippedEndMs <= clippedStartMs) continue;

      let cursor = clippedStartMs;
      while (cursor < clippedEndMs) {
        const dayIndex = Math.floor((cursor - weekStartMs) / DAY_MS);
        if (dayIndex < 0 || dayIndex > 6) break;

        const dayStartMs = weekStartMs + dayIndex * DAY_MS;
        const dayEndMs = dayStartMs + DAY_MS;
        const segmentEndMs = Math.min(dayEndMs, clippedEndMs);

        buckets[dayIndex].push({ entry, dayIndex, actualStartMs: cursor, actualEndMs: segmentEndMs });

        cursor = segmentEndMs;
      }
    }

    return buckets.map((daySegments, dayIndex) => {
      const dayStartMs = weekStartMs + dayIndex * DAY_MS;
      const dayEndMs = dayStartMs + DAY_MS;
      return assignOverlapLanes(daySegments, dayStartMs, dayEndMs);
    });
  }, [entries, now, weekEndExclusiveMs, weekStartMs]);

  const timelineHeight = HOUR_HEIGHT * 24 + TIMELINE_GUTTER * 2;
  const draftRange = dragState
    ? normalizeDraftRange(
        dragState.anchorMs,
        dragState.currentMs,
        dragState.dayStartMs,
        dragState.dayEndMs
      )
    : null;

  const onDayPointerDown = (
    event: PointerEvent<HTMLDivElement>,
    dayIndex: number,
    dayStartMs: number,
    dayEndMs: number
  ) => {
    if (event.button !== 0) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("[data-entry-segment='true']")
    ) {
      return;
    }

    const anchorMs = pointerToSnappedMs(
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      dayStartMs,
      dayEndMs
    );

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      dayIndex,
      dayStartMs,
      dayEndMs,
      anchorMs,
      currentMs: anchorMs,
      initialClientY: event.clientY,
    });
  };

  const onDayPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pointerId = event.pointerId;
    const clientY = event.clientY;
    const rect = event.currentTarget.getBoundingClientRect();

    setDragState((current) => {
      if (!current || current.pointerId !== pointerId) return current;
      const currentMs = pointerToSnappedMs(
        clientY,
        rect,
        current.dayStartMs,
        current.dayEndMs
      );
      return { ...current, currentMs };
    });
  };

  const onDayPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const currentMs = pointerToSnappedMs(
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      dragState.dayStartMs,
      dragState.dayEndMs
    );
    const didDrag = Math.abs(event.clientY - dragState.initialClientY) >= 4;
    if (didDrag) {
      const range = normalizeDraftRange(
        dragState.anchorMs,
        currentMs,
        dragState.dayStartMs,
        dragState.dayEndMs
      );
      onCreateRange(range);
    }

    setDragState(null);
  };

  const onDayPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="pl-2 text-lg font-semibold">{weekLabel}</h2>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onPrevWeek}>
            <ChevronLeftIcon className="size-4" />
            Prev
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCurrentWeek}>
            Today
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onNextWeek}>
            Next
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <div className="min-w-[680px] md:min-w-0 md:w-full">
          <div className="sticky top-0 z-20 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b bg-card">
            <div className="border-r p-3 text-xs uppercase text-muted-foreground">Time</div>
            {days.map((day) => (
              <div key={day.index} className="border-r p-3 text-sm last:border-r-0">
                {day.label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
            <div className="relative border-r" style={{ height: timelineHeight }}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={`hour-${hour}`}
                  className="absolute left-0 right-0 -translate-y-1/2 px-2 text-[10px] text-muted-foreground"
                  style={{ top: hour * HOUR_HEIGHT + TIMELINE_GUTTER }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {segmentsByDay.map((segments, dayIndex) => {
              const dayStartMs = weekStartMs + dayIndex * DAY_MS;

              return (
                <div
                  key={`day-${dayIndex}`}
                  className="relative border-r last:border-r-0"
                  style={{ height: timelineHeight }}
                  onPointerDown={(event) =>
                    onDayPointerDown(event, dayIndex, dayStartMs, dayStartMs + DAY_MS)
                  }
                  onPointerMove={onDayPointerMove}
                  onPointerUp={onDayPointerUp}
                  onPointerCancel={onDayPointerCancel}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={`line-${dayIndex}-${hour}`}
                      className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-border/60"
                      style={{ top: hour * HOUR_HEIGHT + TIMELINE_GUTTER }}
                    />
                  ))}

                {segments.map((segment) => {
                  const startMinutes = (segment.displayStartMs - dayStartMs) / 60000;
                  const endMinutes = (segment.displayEndMs - dayStartMs) / 60000;
                  const top = startMinutes * PX_PER_MINUTE + TIMELINE_GUTTER;
                  const height = Math.max(24, (endMinutes - startMinutes) * PX_PER_MINUTE);
                  const leftPct = (segment.lane / segment.laneCount) * 100;
                    const widthPct = 100 / segment.laneCount;
                    const primaryTag = segment.entry.tagIds
                      .map((id) => tagMap.get(id))
                      .find(Boolean);
                    const accentColor = primaryTag?.color || "#94a3b8";

                  return (
                      <button
                        key={`${segment.entry.id}-${segment.actualStartMs}`}
                        data-entry-segment="true"
                        type="button"
                        className="absolute overflow-hidden rounded-none border bg-background px-2 py-1 text-left shadow-sm"
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                        onClick={() => onEdit(segment.entry)}
                      >
                        <span
                          className="pointer-events-none absolute bottom-0 left-0 top-0 w-1"
                          style={{ backgroundColor: accentColor }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold">
                            {segment.entry.description || "Untitled"}
                        </p>
                        <p className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDuration(
                            Math.max(
                              0,
                              Math.floor(
                                ((segment.entry.endAt ?? now) - segment.entry.startAt) / 1000
                              )
                            )
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}

                  {draftRange && dragState?.dayIndex === dayIndex ? (
                    <div
                      className="pointer-events-none absolute left-[2px] right-[2px] z-10 border border-primary/70 bg-primary/15"
                      style={{
                        top:
                          ((draftRange.startAt - dayStartMs) / 60000) * PX_PER_MINUTE +
                          TIMELINE_GUTTER,
                        height: Math.max(
                          24,
                          ((draftRange.endAt - draftRange.startAt) / 60000) *
                            PX_PER_MINUTE
                        ),
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function startOfWeekSunday(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function assignOverlapLanes(
  segments: RawSegment[],
  dayStartMs: number,
  dayEndMs: number
): PositionedSegment[] {
  const snapped: DisplaySegment[] = segments.map((segment) => {
    const displayStartMs = Math.max(dayStartMs, floorToSnap(segment.actualStartMs));
    const ceilEndMs = Math.min(dayEndMs, ceilToSnap(segment.actualEndMs));
    const minEndMs = Math.min(dayEndMs, displayStartMs + DISPLAY_SNAP_MS);
    const displayEndMs = Math.max(ceilEndMs, minEndMs);

    return { ...segment, displayStartMs, displayEndMs };
  });

  const sorted = [...snapped].sort((a, b) => {
    if (a.displayStartMs !== b.displayStartMs) return a.displayStartMs - b.displayStartMs;
    return a.displayEndMs - b.displayEndMs;
  });

  const positioned: PositionedSegment[] = [];
  let group: DisplaySegment[] = [];
  let groupMaxEnd = -1;

  const flushGroup = () => {
    if (group.length === 0) return;

    const laneEndTimes: number[] = [];
    const temp: Array<{ segment: DisplaySegment; lane: number }> = [];

    for (const segment of group) {
      let lane = laneEndTimes.findIndex((endMs) => endMs <= segment.displayStartMs);
      if (lane === -1) {
        lane = laneEndTimes.length;
        laneEndTimes.push(segment.displayEndMs);
      } else {
        laneEndTimes[lane] = segment.displayEndMs;
      }
      temp.push({ segment, lane });
    }

    const laneCount = laneEndTimes.length;
    for (const item of temp) {
      positioned.push({ ...item.segment, lane: item.lane, laneCount });
    }

    group = [];
    groupMaxEnd = -1;
  };

  for (const segment of sorted) {
    if (group.length === 0) {
      group.push(segment);
      groupMaxEnd = segment.displayEndMs;
      continue;
    }

    if (segment.displayStartMs >= groupMaxEnd) {
      flushGroup();
      group.push(segment);
      groupMaxEnd = segment.displayEndMs;
      continue;
    }

    group.push(segment);
    groupMaxEnd = Math.max(groupMaxEnd, segment.displayEndMs);
  }

  flushGroup();
  return positioned;
}

function formatHour(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${suffix}`;
}

function formatCalendarDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function floorToSnap(ms: number) {
  return Math.floor(ms / DISPLAY_SNAP_MS) * DISPLAY_SNAP_MS;
}

function ceilToSnap(ms: number) {
  return Math.ceil(ms / DISPLAY_SNAP_MS) * DISPLAY_SNAP_MS;
}

function roundToSnap(ms: number) {
  return Math.round(ms / DISPLAY_SNAP_MS) * DISPLAY_SNAP_MS;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pointerToSnappedMs(
  clientY: number,
  rect: DOMRect,
  dayStartMs: number,
  dayEndMs: number
) {
  const timelineBodyHeight = HOUR_HEIGHT * 24;
  const relativeY = clientY - rect.top - TIMELINE_GUTTER;
  const clampedY = clamp(relativeY, 0, timelineBodyHeight);
  const rawMs = dayStartMs + (clampedY / PX_PER_MINUTE) * 60000;
  const snapped = roundToSnap(rawMs);
  return clamp(snapped, dayStartMs, dayEndMs);
}

function normalizeDraftRange(
  anchorMs: number,
  currentMs: number,
  dayStartMs: number,
  dayEndMs: number
) {
  let startAt = clamp(Math.min(anchorMs, currentMs), dayStartMs, dayEndMs);
  let endAt = clamp(Math.max(anchorMs, currentMs), dayStartMs, dayEndMs);

  if (endAt - startAt < DISPLAY_SNAP_MS) {
    endAt = startAt + DISPLAY_SNAP_MS;
  }

  if (endAt > dayEndMs) {
    endAt = dayEndMs;
    startAt = Math.max(dayStartMs, endAt - DISPLAY_SNAP_MS);
  }

  return { startAt, endAt };
}
