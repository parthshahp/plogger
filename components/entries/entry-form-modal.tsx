"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Tag } from "@/lib/db";

export function EntryFormModal({
  title,
  subtitle,
  submitLabel,
  dangerLabel,
  tags,
  initialDescription = "",
  initialTagIds = [],
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
  onSubmit: (payload: { description: string; tagIds: string[] }) => Promise<void>;
  onDanger?: () => Promise<void>;
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div>
            <label className="text-xs uppercase text-muted-foreground">Description</label>
            <input
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you working on?"
            />
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
