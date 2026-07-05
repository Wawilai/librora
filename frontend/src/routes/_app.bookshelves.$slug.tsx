import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useStore, useVisibleItems } from "@/lib/store";
import { BOOKSHELVES, bookshelfLabel } from "@/lib/bookshelves";
import { adapter } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import { LibraryItemCard } from "@/components/librora/library-item-card";
import { PageHeader } from "@/components/librora/page-header";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/librora/shared-states";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LayoutGrid, List, RefreshCcw } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/bookshelves/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${bookshelfLabel(params.slug)} - Librora` }],
  }),
  component: BookshelfDetail,
});

function BookshelfDetail() {
  const t = useT();
  const { slug } = useParams({ from: "/_app/bookshelves/$slug" });
  const localItems = useVisibleItems().filter((i) => i.bookshelf === slug);
  const def = BOOKSHELVES.find((b) => b.slug === slug);
  const [view, setView] = useState<"grid" | "list">("grid");

  const {
    data: serverItems,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.items.bookshelf(slug),
    queryFn: () => adapter.items.list({ bookshelf: slug, archived: false, limit: 500 }),
  });

  useEffect(() => {
    if (!serverItems) return;
    useStore.setState((state) => {
      const incoming = new Map(serverItems.map((item) => [item.id, item]));
      const merged = state.items.map((item) => incoming.get(item.id) ?? item);
      const existing = new Set(state.items.map((item) => item.id));
      for (const item of serverItems) {
        if (!existing.has(item.id)) merged.push(item);
      }
      return { items: merged };
    });
  }, [serverItems]);

  const items = useMemo(() => serverItems ?? localItems, [serverItems, localItems]);
  const showLoading = isLoading && localItems.length === 0;
  const showError = isError && localItems.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/bookshelves"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {t("bookshelvesPage.backToAll")}
      </Link>
      <PageHeader
        title={def?.label || t("bookshelvesPage.defaultTitle")}
        description={def?.description}
        icon={<LayoutGrid className="h-5 w-5" />}
        actions={
          !showLoading &&
          !showError &&
          items.length > 0 && (
            <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-background p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`grid h-7 w-7 place-items-center rounded ${
                  view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
                aria-label={t("filters.gridView")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`grid h-7 w-7 place-items-center rounded ${
                  view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
                aria-label={t("filters.listView")}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        }
      />

      {showLoading ? (
        <LoadingSkeleton rows={4} />
      ) : showError ? (
        <ErrorState
          title={t("bookshelvesPage.detailLoadErrorTitle")}
          description={t("bookshelvesPage.detailLoadErrorDesc")}
          action={
            <Button variant="outline" className="gap-1.5" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" /> {t("bookshelvesPage.retry")}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("bookshelvesPage.detailEmptyTitle")}
          description={t("bookshelvesPage.detailEmptyDesc")}
        />
      ) : (
        <div
          className={
            view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"
          }
        >
          {items.map((i) => (
            <LibraryItemCard key={i.id} item={i} variant={view} />
          ))}
        </div>
      )}
    </div>
  );
}
