"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db, type Tag } from "@/lib/db";
import { createTag, deleteTag, updateTag } from "@/lib/data";

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

const DEFAULT_TAG_COLOR = "#ffffff";

export default function TagsPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);
  const [search, setSearch] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setIsModalOpen(false);
  };

  const onEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color ?? DEFAULT_TAG_COLOR);
    setIsModalOpen(true);
  };

  const pickerColor = isHexColor(color) ? color : DEFAULT_TAG_COLOR;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleTags = (tags ?? []).filter((tag) =>
    tag.name.toLowerCase().includes(normalizedSearch)
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tags..."
          className="w-full rounded-md border bg-background px-4 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] sm:max-w-sm"
        />
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          New tag
        </Button>
      </div>

      <div className="space-y-3">
        {(tags ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-muted-foreground">
            No tags yet.
          </div>
        )}
        {(tags ?? []).length > 0 && visibleTags.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-muted-foreground">
            No tags match your search.
          </div>
        )}
        {visibleTags.map((tag) => (
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

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit tag" : "Create a tag"}</DialogTitle>
            <DialogDescription>
              Organize time with optional labels and colors.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
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

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit}>
              {editingTag ? "Save tag" : "Add tag"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
