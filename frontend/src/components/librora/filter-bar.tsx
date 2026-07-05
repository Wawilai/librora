import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BOOKSHELVES } from "@/lib/bookshelves";
import { LayoutGrid, List, X } from "lucide-react";
import type { ItemStatus } from "@/lib/api/types";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export type DateRange = "all" | "today" | "week" | "month" | "year";

export interface Filters {
  status: ItemStatus | "all";
  bookshelf: string;
  sort: "recent" | "oldest" | "updated" | "title";
  tag?: string;
  readingList?: "all" | "only";
  date?: DateRange;
}

export const DEFAULT_FILTERS: Filters = {
  status: "all",
  bookshelf: "all",
  sort: "recent",
  tag: "all",
  readingList: "all",
  date: "all",
};

export function FilterBar({
  filters,
  onChange,
  view,
  onViewChange,
  count,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  view?: "grid" | "list";
  onViewChange?: (v: "grid" | "list") => void;
  count?: number;
}) {
  const items = useStore((s) => s.items);
  const t = useT();
  const allTags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.tags.forEach((tg) => s.add(tg)));
    return Array.from(s).sort();
  }, [items]);

  const hasActive =
    filters.status !== "all" ||
    filters.bookshelf !== "all" ||
    filters.sort !== "recent" ||
    (filters.tag && filters.tag !== "all") ||
    (filters.readingList && filters.readingList !== "all") ||
    (filters.date && filters.date !== "all");

  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-card px-3 py-2 sm:mx-0 sm:flex-wrap sm:overflow-visible [&_button[role=combobox]]:shrink-0">
      <Select
        value={filters.status}
        onValueChange={(v) => onChange({ ...filters, status: v as Filters["status"] })}
      >
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue placeholder={t("filters.statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
          <SelectItem value="ready">{t("status.ready")}</SelectItem>
          <SelectItem value="processing">{t("status.processing")}</SelectItem>
          <SelectItem value="pending">{t("status.pending")}</SelectItem>
          <SelectItem value="partial">{t("status.partial")}</SelectItem>
          <SelectItem value="failed">{t("status.failed")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.bookshelf}
        onValueChange={(v) => onChange({ ...filters, bookshelf: v })}
      >
        <SelectTrigger className="h-8 w-[170px]">
          <SelectValue placeholder={t("filters.bookshelfPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allBookshelves")}</SelectItem>
          {BOOKSHELVES.map((b) => (
            <SelectItem key={b.slug} value={b.slug}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.tag ?? "all"} onValueChange={(v) => onChange({ ...filters, tag: v })}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder={t("filters.tagPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allTags")}</SelectItem>
          {allTags.map((tg) => (
            <SelectItem key={tg} value={tg}>
              #{tg}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.readingList ?? "all"}
        onValueChange={(v) => onChange({ ...filters, readingList: v as "all" | "only" })}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder={t("filters.readingListPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allItems")}</SelectItem>
          <SelectItem value="only">{t("filters.inReadingList")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.date ?? "all"}
        onValueChange={(v) => onChange({ ...filters, date: v as DateRange })}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder={t("filters.datePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.anyTime")}</SelectItem>
          <SelectItem value="today">{t("filters.today")}</SelectItem>
          <SelectItem value="week">{t("filters.past7")}</SelectItem>
          <SelectItem value="month">{t("filters.past30")}</SelectItem>
          <SelectItem value="year">{t("filters.pastYear")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Select
          value={filters.sort}
          onValueChange={(v) => onChange({ ...filters, sort: v as Filters["sort"] })}
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder={t("filters.sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("filters.sortNewest")}</SelectItem>
            <SelectItem value="oldest">{t("filters.sortOldest")}</SelectItem>
            <SelectItem value="updated">{t("filters.sortUpdated")}</SelectItem>
            <SelectItem value="title">{t("filters.sortTitle")}</SelectItem>
          </SelectContent>
        </Select>

        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
          >
            <X className="mr-1 h-3.5 w-3.5" /> {t("common.clearAll")}
          </Button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {typeof count === "number" && (
          <span className="text-xs text-muted-foreground">{t("filters.items", { n: count })}</span>
        )}
        {view && onViewChange && (
          <div className="flex rounded-md border border-border bg-background p-0.5">
            <button
              onClick={() => onViewChange("grid")}
              className={`grid h-7 w-7 place-items-center rounded ${
                view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
              aria-label={t("filters.gridView")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={`grid h-7 w-7 place-items-center rounded ${
                view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
              aria-label={t("filters.listView")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
