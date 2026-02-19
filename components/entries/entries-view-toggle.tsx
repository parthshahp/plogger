import { Button } from "@/components/ui/button";

export type EntriesView = "list" | "week";

export function EntriesViewToggle({
  view,
  onChange,
}: {
  view: EntriesView;
  onChange: (next: EntriesView) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-card p-1">
      <Button
        type="button"
        size="sm"
        variant={view === "list" ? "default" : "ghost"}
        onClick={() => onChange("list")}
      >
        List
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "week" ? "default" : "ghost"}
        onClick={() => onChange("week")}
      >
        Week
      </Button>
    </div>
  );
}
