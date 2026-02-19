"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

const ENTRIES_VIEW_STORAGE_KEY = "plogger:entries:view";

export default function EntriesNavLink() {
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const saved = window.localStorage.getItem(ENTRIES_VIEW_STORAGE_KEY);
    if (saved === "week") {
      event.preventDefault();
      router.push("/entries?view=week");
    }
  };

  return (
    <Link className="text-muted-foreground hover:text-foreground" href="/entries" onClick={onClick}>
      Entries
    </Link>
  );
}
