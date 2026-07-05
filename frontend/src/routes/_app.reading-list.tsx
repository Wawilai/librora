import { createFileRoute } from "@tanstack/react-router";
import { useStore, useVisibleItems } from "@/lib/store";
import { LibraryItemCard } from "@/components/librora/library-item-card";
import { PageHeader } from "@/components/librora/page-header";
import { EmptyState } from "@/components/librora/shared-states";
import { SearchInput } from "@/components/librora/search-input";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "@/components/librora/filter-bar";
import { Bookmark, CheckSquare2, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/reading-list")({
  head: () => ({ meta: [{ title: "Reading List - Librora" }] }),
  component: ReadingListPage,
});

function applyFilters(items: ReturnType<typeof useVisibleItems>, filters: Filters, q: string) {
  let list = items.slice();
  if (filters.status !== "all") list = list.filter((i) => i.status === filters.status);
  if (filters.bookshelf !== "all") list = list.filter((i) => i.bookshelf === filters.bookshelf);
  if (filters.tag && filters.tag !== "all")
    list = list.filter((i) => i.tags.includes(filters.tag!));
  if (filters.date && filters.date !== "all") {
    const now = Date.now();
    const ms = { today: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3, year: 365 * 86400e3 }[
      filters.date
    ]!;
    list = list.filter((i) => now - new Date(i.addedAt).getTime() <= ms);
  }
  if (q.trim()) {
    const k = q.trim().toLowerCase();
    list = list.filter((i) =>
      [i.title, i.extractedTitle, i.description, i.url, i.domain, i.personalNote, ...i.tags]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(k)),
    );
  }
  list.sort((a, b) => {
    switch (filters.sort) {
      case "oldest":
        return +new Date(a.addedAt) - +new Date(b.addedAt);
      case "updated":
        return +new Date(b.processedAt ?? b.addedAt) - +new Date(a.processedAt ?? a.addedAt);
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return +new Date(b.addedAt) - +new Date(a.addedAt);
    }
  });
  return list;
}

function ReadingListPage() {
  const t = useT();
  const items = useVisibleItems().filter((i) => i.inReadingList);
  const toggleReadingList = useStore((s) => s.toggleReadingList);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => applyFilters(items, filters, query), [items, filters, query]);

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const clearSelection = () => setSelected(new Set());
  const bulkRemove = () => {
    selected.forEach((id) => toggleReadingList(id));
    toast(t("readingListPage.bulkRemovedToast", { n: selected.size }));
    clearSelection();
  };

  const removeFromList = (id: string, title: string) => {
    toggleReadingList(id);
    toast(t("readingListPage.removedToast"), {
      description: title,
      action: { label: t("common.undo"), onClick: () => toggleReadingList(id) },
      duration: 5000,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("readingListPage.title")}
        description={t("readingListPage.description")}
        icon={<Bookmark className="h-5 w-5" />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-5 w-5" />}
          title={t("readingListPage.emptyTitle")}
          description={t("readingListPage.emptyDesc")}
        />
      ) : (
        <>
          <div className="mb-3 sm:max-w-md">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder={t("readingListPage.searchPlaceholder")}
              size="sm"
            />
          </div>
          <div className="mb-4">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              view={view}
              onViewChange={setView}
              count={visible.length}
            />
          </div>

          {selected.size > 0 && (
            <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 shadow-sm">
              <span className="text-sm font-medium text-foreground">
                {t("readingListPage.selected", { n: selected.size })}
              </span>
              <button
                type="button"
                onClick={bulkRemove}
                className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
              >
                {t("readingListPage.removeSelected")}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                {t("readingListPage.clearSelection")}
              </button>
            </div>
          )}

          {visible.length > 1 && selected.size === 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set(visible.map((i) => i.id)))}
              className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Square className="h-3.5 w-3.5" />
              {t("readingListPage.selectAll", { n: visible.length })}
            </button>
          )}

          {visible.length === 0 ? (
            <EmptyState
              title={t("readingListPage.noMatchTitle")}
              description={t("readingListPage.noMatchDesc")}
            />
          ) : (
            <div
              className={
                view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"
              }
            >
              {visible.map((i) => (
                <div key={i.id} className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(i.id);
                    }}
                    aria-label={
                      selected.has(i.id)
                        ? t("readingListPage.deselectAria")
                        : t("readingListPage.selectAria")
                    }
                    className="absolute left-3 top-3 z-20 grid h-6 w-6 place-items-center rounded-md border border-border bg-background/90 backdrop-blur transition-colors hover:border-primary"
                  >
                    {selected.has(i.id) ? (
                      <CheckSquare2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <LibraryItemCard item={i} variant={view} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromList(i.id, i.title);
                    }}
                    className="absolute right-3 top-3 z-20 rounded-md border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur hover:bg-background hover:text-foreground"
                    aria-label={t("readingListPage.removeAria")}
                    title={t("readingListPage.removeAria")}
                  >
                    {t("readingListPage.remove")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
