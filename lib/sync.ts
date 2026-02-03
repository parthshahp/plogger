import { db, type Device, type Entry, type Tag } from "@/lib/db";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function ensureDevice(): Promise<Device> {
  const existing = await db.device.toCollection().first();
  if (existing) return existing;

  const device: Device = {
    id: newId(),
    schemaVersion: 1,
  };
  await db.device.add(device);
  return device;
}

async function collectOplog(since?: number) {
  if (since) {
    return db.oplog.where("ts").above(since).toArray();
  }
  return db.oplog.toArray();
}

async function applyRemoteTags(tags: Tag[]) {
  for (const tag of tags) {
    const existing = await db.tags.get(tag.id);
    if (!existing || (tag.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      await db.tags.put(tag);
    }
  }
}

async function applyRemoteEntries(entries: Entry[]) {
  for (const entry of entries) {
    const existing = await db.entries.get(entry.id);
    if (!existing || (entry.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      await db.entries.put(entry);
    }
  }
}

export async function syncNow() {
  const device = await ensureDevice();
  let since = device.lastSyncAt ?? 0;
  const changes = await collectOplog(since);

  if (changes.length > 0) {
    const pushResponse = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: device.id, changes }),
    });

    if (pushResponse.ok) {
      const pushPayload = (await pushResponse.json()) as {
        accepted: number;
        serverTime: number;
      };
      const ids = changes.map((change) => change.id);
      await db.oplog.bulkDelete(ids);
      await db.device.update(device.id, { lastSyncAt: pushPayload.serverTime });
      since = pushPayload.serverTime;
    }
  }

  const sinceParam = since.toString();
  const pullResponse = await fetch(`/api/sync/pull?since=${sinceParam}`);
  if (!pullResponse.ok) {
    return;
  }

  const pullPayload = (await pullResponse.json()) as {
    changes: { tags: Tag[]; entries: Entry[] };
    serverTime: number;
  };

  await db.transaction(
    "rw",
    db.tags,
    db.entries,
    db.device,
    async () => {
      await applyRemoteTags(pullPayload.changes.tags ?? []);
      await applyRemoteEntries(pullPayload.changes.entries ?? []);
      await db.device.update(device.id, { lastSyncAt: pullPayload.serverTime });
    }
  );
}
