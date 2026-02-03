import { NextResponse } from "next/server";
import type { Entry, Tag } from "@/lib/db";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since") ?? "0";
  const since = Number(sinceParam);
  const store = await readStore();

  const tags = Object.values(store.tags).filter(
    (tag) => (tag.updatedAt ?? 0) > since
  );

  const entries = Object.values(store.entries).filter(
    (entry) => (entry.updatedAt ?? 0) > since
  );

  return NextResponse.json({
    changes: {
      tags: tags as Tag[],
      entries: entries as Entry[],
    },
    serverTime: Date.now(),
  });
}
