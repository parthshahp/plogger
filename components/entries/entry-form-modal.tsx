"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Tag } from "@/lib/db";

function toTimeValue(timestamp: number) {
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeValue(value: string) {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function applyTimeToDate(baseTimestamp: number, timeValue: string) {
  const parsed = parseTimeValue(timeValue);
  if (!parsed) return null;

  const date = new Date(baseTimestamp);
  date.setHours(parsed.hours, parsed.minutes, 0, 0);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function EntryFormModal({
  title,
  subtitle,
  submitLabel,
  dangerLabel,
  tags,
  initialDescription = "",
  initialTagIds = [],
  initialStartAt,
  initialEndAt,
  showTimeFields = false,
  requireEndAt = false,
  onSubmit,
  onDanger,
  onClose,
}: {
  title: string;
  subtitle?: string;
  submitLabel: string;
  dangerLabel?: string;
  tags: Tag[];
  initialDescription?: string;
  initialTagIds?: string[];
  initialStartAt?: number;
  initialEndAt?: number | null;
  showTimeFields?: boolean;
  requireEndAt?: boolean;
  onSubmit: (payload: {
    description: string;
    tagIds: string[];
    startAt: number;
    endAt: number | null;
  }) => Promise<void>;
  onDanger?: () => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTagIds);
  const [initialStartTimestamp] = useState(() => initialStartAt ?? Date.now());
  const [startAtValue, setStartAtValue] = useState(() => toTimeValue(initialStartTimestamp));
  const [endAtValue, setEndAtValue] = useState(() =>
    initialEndAt ? toTimeValue(initialEndAt) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const onToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const onSubmitForm = async () => {
    if (isSaving) return;
    const parsedStartAt = applyTimeToDate(initialStartTimestamp, startAtValue);
    const parsedEndAt = endAtValue
      ? applyTimeToDate(initialEndAt ?? initialStartTimestamp, endAtValue)
      : null;

    if (!parsedStartAt) {
      setError("Start time is required.");
      return;
    }

    if (requireEndAt && parsedEndAt === null) {
      setError("End time is required.");
      return;
    }

    if (parsedEndAt !== null && parsedEndAt < parsedStartAt) {
      setError("End time must be after start time.");
      return;
    }

    setError(null);
    setIsSaving(true);
    await onSubmit({
      description,
      tagIds: selectedTags,
      startAt: parsedStartAt,
      endAt: parsedEndAt,
    });
    setIsSaving(false);
  };

  const onDangerAction = async () => {
    if (!onDanger || isSaving) return;
    setIsSaving(true);
    await onDanger();
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-2xl rounded-lg border bg-background p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle || "Add context and optional tags while the timer runs."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            X
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <label className="text-xs uppercase text-muted-foreground">Description</label>
            <input
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you working on?"
            />

            {showTimeFields ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-muted-foreground">Start time</label>
                  <input
                    type="time"
                    className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none"
                    value={startAtValue}
                    onChange={(event) => setStartAtValue(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-muted-foreground">End time</label>
                  <input
                    type="time"
                    className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none"
                    value={endAtValue}
                    onChange={(event) => setEndAtValue(event.target.value)}
                    placeholder="Blank means running"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {requireEndAt ? "Required" : "Blank means currently running"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length === 0 && (
                <span className="text-sm text-muted-foreground">Add tags in the Tags page.</span>
              )}
              {tags.map((tag) => (
                <Button
                  key={tag.id}
                  type="button"
                  size="sm"
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  onClick={() => onToggleTag(tag.id)}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color || "#ffffff" }}
                  />
                  {tag.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          {error ? <p className="mr-auto text-sm text-destructive">{error}</p> : null}
          {onDanger ? (
            <Button type="button" variant="destructive" onClick={onDangerAction}>
              {dangerLabel || "Delete"}
            </Button>
          ) : null}
          <Button type="button" onClick={onSubmitForm}>
            {isSaving ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
