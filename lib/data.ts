import { db, type Entry, type Tag } from "./db";
import { recordOplog } from "./oplog";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createTag({
  name,
  color,
}: {
  name: string;
  color?: string;
}): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tag name is required");
  }
  const now = Date.now();
  const tag: Tag = {
    id: newId(),
    name: trimmed,
    color: color?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.tags, db.oplog, async () => {
    await db.tags.add(tag);
    await recordOplog("tags", tag.id, "upsert", tag);
  });
  return tag.id;
}

export async function updateTag({
  id,
  name,
  color,
}: {
  id: string;
  name: string;
  color?: string;
}): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tag name is required");
  }
  const now = Date.now();
  await db.transaction("rw", db.tags, db.oplog, async () => {
    await db.tags.update(id, {
      name: trimmed,
      color: color?.trim() || undefined,
      updatedAt: now,
    });
    const updated = await db.tags.get(id);
    if (updated) {
      await recordOplog("tags", id, "upsert", updated);
    }
  });
}

export async function deleteTag(id: string): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.tags, db.oplog, async () => {
    await db.tags.update(id, { deletedAt: now, updatedAt: now });
    const updated = await db.tags.get(id);
    if (updated) {
      await recordOplog("tags", id, "delete", updated);
    }
  });
}

export async function startTimer({
  description,
  tagIds,
}: {
  description: string;
  tagIds: string[];
}): Promise<string> {
  const now = Date.now();
  const payload: Entry = {
    id: newId(),
    description: description.trim() || "Untitled",
    tagIds,
    startAt: now,
    endAt: null,
    durationSec: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction("rw", db.entries, db.oplog, async () => {
    const running = await db.entries
      .filter((entry) => entry.endAt === null && !entry.deletedAt)
      .first();

    if (running) {
      const durationSec = Math.max(
        0,
        Math.floor((now - running.startAt) / 1000)
      );
      await db.entries.update(running.id, {
        endAt: now,
        durationSec,
        updatedAt: now,
      });
      const updated = await db.entries.get(running.id);
      if (updated) {
        await recordOplog("entries", running.id, "upsert", updated);
      }
    }

    await db.entries.add(payload);
    await recordOplog("entries", payload.id, "upsert", payload);
  });

  return payload.id;
}

export async function stopTimer(entryId: string): Promise<void> {
  const entry = await db.entries.get(entryId);
  if (!entry || entry.deletedAt || entry.endAt) {
    return;
  }
  const now = Date.now();
  const durationSec = Math.max(0, Math.floor((now - entry.startAt) / 1000));
  await db.transaction("rw", db.entries, db.oplog, async () => {
    await db.entries.update(entryId, {
      endAt: now,
      durationSec,
      updatedAt: now,
    });
    const updated = await db.entries.get(entryId);
    if (updated) {
      await recordOplog("entries", entryId, "upsert", updated);
    }
  });
}

export async function updateRunningEntry({
  id,
  description,
  tagIds,
}: {
  id: string;
  description: string;
  tagIds: string[];
}): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.entries, db.oplog, async () => {
    await db.entries.update(id, {
      description: description.trim() || "Untitled",
      tagIds,
      updatedAt: now,
    });
    const updated = await db.entries.get(id);
    if (updated) {
      await recordOplog("entries", id, "upsert", updated);
    }
  });
}

export async function updateEntry({
  id,
  description,
  tagIds,
}: {
  id: string;
  description: string;
  tagIds: string[];
}): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.entries, db.oplog, async () => {
    await db.entries.update(id, {
      description: description.trim() || "Untitled",
      tagIds,
      updatedAt: now,
    });
    const updated = await db.entries.get(id);
    if (updated) {
      await recordOplog("entries", id, "upsert", updated);
    }
  });
}

export async function deleteEntry(id: string): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.entries, db.oplog, async () => {
    await db.entries.update(id, { deletedAt: now, updatedAt: now });
    const updated = await db.entries.get(id);
    if (updated) {
      await recordOplog("entries", id, "delete", updated);
    }
  });
}
