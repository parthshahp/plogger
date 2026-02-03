import { NextResponse } from "next/server";
import type { Entry, Oplog, Tag } from "@/lib/db";
import { readStore, saveStore } from "@/lib/server-store";

export const runtime = "nodejs";

function shouldApply(
  incoming: { updatedAt?: number },
  existing?: { updatedAt?: number }
) {
  if (!existing) return true;
  if (!incoming.updatedAt) return false;
  return incoming.updatedAt > (existing.updatedAt ?? 0);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    deviceId?: string;
    changes?: Oplog[];
  };

  if (!body.deviceId || !Array.isArray(body.changes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const store = await readStore();
  let accepted = 0;

  body.changes.forEach((change) => {
    if (change.entity === "tags") {
      const payload = change.payload as Tag;
      const existing = store.tags[change.entityId];
      if (shouldApply(payload, existing)) {
        store.tags[change.entityId] = payload;
        accepted += 1;
      }
    }

    if (change.entity === "entries") {
      const payload = change.payload as Entry;
      const existing = store.entries[change.entityId];
      if (shouldApply(payload, existing)) {
        store.entries[change.entityId] = payload;
        accepted += 1;
      }
    }
  });

  await saveStore(store);

  return NextResponse.json({ accepted, serverTime: Date.now() });
}
