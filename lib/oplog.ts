import { db, type Entry, type Oplog, type Tag } from "./db";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function recordOplog(
  entity: Oplog["entity"],
  entityId: string,
  op: Oplog["op"],
  payload: Tag | Entry
): Promise<void> {
  const entry: Oplog = {
    id: newId(),
    entity,
    entityId,
    op,
    payload: payload as Record<string, unknown>,
    ts: Date.now(),
  };
  await db.oplog.add(entry);
}
