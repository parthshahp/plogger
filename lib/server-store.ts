import { promises as fs } from "fs";
import path from "path";
import type { Entry, Tag } from "./db";

const STORE_PATH = path.join(process.cwd(), "data", "sync-store.json");

type StoreShape = {
  tags: Record<string, Tag>;
  entries: Record<string, Entry>;
};

async function ensureStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    const initial: StoreShape = { tags: {}, entries: {} };
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function readStore(): Promise<StoreShape> {
  return ensureStore();
}

export async function saveStore(store: StoreShape): Promise<void> {
  await writeStore(store);
}
