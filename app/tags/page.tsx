"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Tag } from "@/lib/db";
import { createTag, deleteTag, updateTag } from "@/lib/data";

export default function TagsPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const tags = useLiveQuery(() =>
    db.tags.orderBy("name").filter((tag) => !tag.deletedAt).toArray()
  );

  const resetForm = () => {
    setName("");
    setColor("");
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
    setColor(tag.color ?? "");
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold">Tags</h1>
        <p className="mt-2 text-slate-300">
          Organize time with optional labels and colors.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <p className="text-sm text-slate-400">
          {editingTag ? "Edit tag" : "Create a tag"}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr]">
          <div>
            <label className="text-xs uppercase text-slate-500">Name</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-500"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Deep work"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Color</label>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-2xl border border-slate-700"
                style={{ backgroundColor: color || "#0f172a" }}
              />
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="#38bdf8"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            {editingTag ? "Save tag" : "Add tag"}
          </button>
          {editingTag && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your tags</h2>
        {(tags ?? []).length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-slate-400">
            No tags yet.
          </div>
        )}
        {(tags ?? []).map((tag) => (
          <div
            key={tag.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tag.color || "#64748b" }}
              />
              <div>
                <p className="text-base font-semibold text-slate-100">
                  {tag.name}
                </p>
                <p className="text-xs text-slate-500">
                  {tag.color || "No color"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onEdit(tag)}
                className="text-xs text-slate-200 hover:text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteTag(tag.id)}
                className="text-xs text-rose-200 hover:text-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
