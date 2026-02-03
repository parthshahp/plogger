import Dexie, { type Table } from "dexie";

export type Tag = {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

export type Entry = {
  id: string;
  description: string;
  tagIds: string[];
  startAt: number;
  endAt: number | null;
  durationSec: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

export type Device = {
  id: string;
  lastSyncAt?: number;
  schemaVersion: number;
};

export type Oplog = {
  id: string;
  entity: "tags" | "entries";
  entityId: string;
  op: "upsert" | "delete";
  payload: Record<string, unknown>;
  ts: number;
};

export class PloggerDB extends Dexie {
  tags!: Table<Tag, string>;
  entries!: Table<Entry, string>;
  device!: Table<Device, string>;
  oplog!: Table<Oplog, string>;

  constructor() {
    super("plogger");
    this.version(1).stores({
      tags: "id, name, updatedAt, deletedAt",
      entries: "id, startAt, endAt, updatedAt, deletedAt",
      device: "id",
      oplog: "id, entity, entityId, ts",
    });
  }
}

export const db = new PloggerDB();
