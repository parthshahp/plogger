"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { db, type Tag } from "@/lib/db";
import { createTag, deleteTag, updateTag } from "@/lib/data";

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

const DEFAULT_TAG_COLOR = "#ffffff";

export default function TagsPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const tags = useLiveQuery(() =>
    db.tags.orderBy("name").filter((tag) => !tag.deletedAt).toArray()
  );

  const resetForm = () => {
    setName("");
    setColor(DEFAULT_TAG_COLOR);
    setEditingTag(null);
  };

  const onSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    if (editingTag) {
      await updateTag({ id: editingTag.id, name, color });
    } else {
      await createTag({ name, color });
    }
    resetForm();
  };

  const onEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color ?? DEFAULT_TAG_COLOR);
  };

  const pickerColor = isHexColor(color) ? color : DEFAULT_TAG_COLOR;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Tags</h1>
        <p className="text-muted-foreground">
          Organize time with optional labels and colors.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          {editingTag ? "Edit tag" : "Create a tag"}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr]">
          <div>
            <label className="text-xs uppercase text-muted-foreground">Name</label>
            <input
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Deep work"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">Color</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                aria-label="Pick tag color"
                className="h-10 w-10 cursor-pointer rounded-full border bg-background p-0"
                style={{ borderRadius: "9999px", overflow: "hidden" }}
                value={pickerColor}
                onChange={(event) => setColor(event.target.value)}
              />
              <input
                className="w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder={DEFAULT_TAG_COLOR}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setColor(DEFAULT_TAG_COLOR)}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={onSubmit}>
            {editingTag ? "Save tag" : "Add tag"}
          </Button>
          {editingTag && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your tags</h2>
        {(tags ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-muted-foreground">
            No tags yet.
          </div>
        )}
        {(tags ?? []).map((tag) => (
          <div
            key={tag.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tag.color || "#64748b" }}
              />
              <div>
                <p className="text-base font-semibold">{tag.name}</p>
                <p className="text-xs text-muted-foreground">{tag.color || "No color"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(tag)}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => deleteTag(tag.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
