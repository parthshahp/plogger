import type { Tag } from "@/lib/db";

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tag.color || "#94a3b8" }}
      />
      {tag.name}
    </span>
  );
}
