import { createFileRoute } from "@tanstack/react-router";
import { useStore, useArchive } from "@/lib/store";
import { LibraryItemCard } from "@/components/librora/library-item-card";
import { PageHeader } from "@/components/librora/page-header";
import { EmptyState } from "@/components/librora/shared-states";
import { SearchInput } from "@/components/librora/search-input";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "@/components/librora/filter-bar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, RotateCcw, Trash2, CheckSquare2, Square } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/archive")({
  head: () => ({ meta: [{ title: "Archive - Librora" }] }),
  component: ArchivePage,
});

function ArchivePage() {
  const t = useT();
  const items = useArchive();
  const restore = useStore((s) => s.restore);
  const remove = useStore((s) => s.remove);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const visible = useMemo(() => {
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
    if (query.trim()) {
      const k = query.trim().toLowerCase();
      list = list.filter((i) =>
        [i.title, i.url, i.domain, i.description, i.personalNote, ...i.tags]
          .filter(Boolean)
          .some((s) => (s as string).toLowerCase().includes(k)),
      );
    }
    list.sort((a, b) => {
      if (filters.sort === "oldest") return +new Date(a.addedAt) - +new Date(b.addedAt);
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      return +new Date(b.addedAt) - +new Date(a.addedAt);
    });
    return list;
  }, [items, filters, query]);

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectAll = () => setSelected(new Set(visible.map((i) => i.id)));
  const clearSelection = () => setSelected(new Set());
  const bulkRestore = () => {
    selected.forEach((id) => restore(id));
    toast(t("archivePage.restoredToast", { n: selected.size }));
    clearSelection();
  };
  const bulkDelete = () => {
    selected.forEach((id) => remove(id));
    toast(t("archivePage.deletedToast", { n: selected.size }));
    clearSelection();
    setConfirmBulkDelete(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("archivePage.title")}
        description={t("archivePage.description")}
        icon={<Archive className="h-5 w-5" />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-5 w-5" />}
          title={t("archivePage.emptyTitle")}
          description={t("archivePage.emptyDesc")}
        />
      ) : (
        <>
          <div className="mb-3 sm:max-w-md">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder={t("archivePage.searchPlaceholder")}
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
                {t("archivePage.selected", { n: selected.size })}
              </span>
              <Button size="sm" variant="outline" onClick={bulkRestore}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t("archivePage.restoreAll")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmBulkDelete(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("archivePage.deleteAll")}
              </Button>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                {t("archivePage.clearSelection")}
              </button>
            </div>
          )}

          {visible.length > 1 && selected.size === 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Square className="h-3.5 w-3.5" />
              {t("archivePage.selectAll", { n: visible.length })}
            </button>
          )}

          {visible.length === 0 ? (
            <EmptyState
              title={t("archivePage.noMatchTitle")}
              description={t("archivePage.noMatchDesc")}
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
                        ? t("archivePage.deselectAria")
                        : t("archivePage.selectAria")
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
                  <div className="pointer-events-none absolute right-3 top-3 z-20 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="pointer-events-auto h-7 bg-background/90 px-2 text-xs backdrop-blur"
                      onClick={(e) => {
                        e.stopPropagation();
                        restore(i.id);
                        toast(t("archivePage.restoredSingleToast"), {
                          description: i.title,
                          action: {
                            label: t("common.undo"),
                            onClick: () => useStore.getState().archive(i.id),
                          },
                          duration: 5000,
                        });
                      }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      {t("archivePage.restore")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="pointer-events-auto h-7 bg-background/90 px-2 text-xs text-destructive backdrop-blur hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: i.id, title: i.title });
                      }}
                      aria-label={t("archivePage.deletePermanentlyAria")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("archivePage.bulkDeleteTitle", { n: selected.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("archivePage.bulkDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={bulkDelete}
            >
              {t("archivePage.deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.deleteItemTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.deleteItemDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  remove(confirmDelete.id);
                  toast(t("archivePage.deleteItemToast"));
                }
                setConfirmDelete(null);
              }}
            >
              {t("dialogs.deleteItem")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
