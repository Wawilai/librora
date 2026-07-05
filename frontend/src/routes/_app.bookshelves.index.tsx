import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/librora/page-header";
import { useBookshelvesQuery } from "@/lib/query/use-bookshelves-query";
import { useVisibleItems } from "@/lib/store";
import { useMemo, useState } from "react";
import { LayoutGrid, Library, List, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/librora/shared-states";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/bookshelves/")({
  head: () => ({ meta: [{ title: "Smart Bookshelves — Librora" }] }),
  component: BookshelvesPage,
});

// Per-shelf color palette (soft, distinct, works in light/dark)
const SHELF_PALETTE: Record<string, { bg: string; fg: string; bar: string }> = {
  code: {
    bg: "bg-sky-100 dark:bg-sky-500/15",
    fg: "text-sky-600 dark:text-sky-300",
    bar: "bg-sky-400/80",
  },
  "software-development": {
    bg: "bg-indigo-100 dark:bg-indigo-500/15",
    fg: "text-indigo-600 dark:text-indigo-300",
    bar: "bg-indigo-400/80",
  },
  architecture: {
    bg: "bg-slate-100 dark:bg-slate-500/15",
    fg: "text-slate-600 dark:text-slate-300",
    bar: "bg-slate-400/80",
  },
  design: {
    bg: "bg-violet-100 dark:bg-violet-500/15",
    fg: "text-violet-600 dark:text-violet-300",
    bar: "bg-violet-400/80",
  },
  business: {
    bg: "bg-amber-100 dark:bg-amber-500/15",
    fg: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-400/80",
  },
  management: {
    bg: "bg-orange-100 dark:bg-orange-500/15",
    fg: "text-orange-600 dark:text-orange-300",
    bar: "bg-orange-400/80",
  },
  research: {
    bg: "bg-cyan-100 dark:bg-cyan-500/15",
    fg: "text-cyan-600 dark:text-cyan-300",
    bar: "bg-cyan-400/80",
  },
  news: {
    bg: "bg-rose-100 dark:bg-rose-500/15",
    fg: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-400/80",
  },
  tools: {
    bg: "bg-teal-100 dark:bg-teal-500/15",
    fg: "text-teal-600 dark:text-teal-300",
    bar: "bg-teal-400/80",
  },
  learning: {
    bg: "bg-lime-100 dark:bg-lime-500/15",
    fg: "text-lime-600 dark:text-lime-300",
    bar: "bg-lime-500/80",
  },
  ai: {
    bg: "bg-blue-100 dark:bg-blue-500/15",
    fg: "text-blue-600 dark:text-blue-300",
    bar: "bg-blue-400/80",
  },
  productivity: {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15",
    fg: "text-fuchsia-600 dark:text-fuchsia-300",
    bar: "bg-fuchsia-400/80",
  },
  philosophy: {
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    fg: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-400/80",
  },
  other: {
    bg: "bg-stone-100 dark:bg-stone-500/15",
    fg: "text-stone-600 dark:text-stone-300",
    bar: "bg-stone-400/80",
  },
};

function BookshelvesPage() {
  const t = useT();
  const items = useVisibleItems();
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data: bookshelves, isLoading, isError, refetch } = useBookshelvesQuery();
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of items) if (i.bookshelf) m[i.bookshelf] = (m[i.bookshelf] || 0) + 1;
    return m;
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("bookshelvesPage.title")}
        description={t("bookshelvesPage.description")}
        icon={<LayoutGrid className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("bookshelvesPage.autoOrganized")}
            </span>
            {!isLoading && !isError && !!bookshelves?.length && (
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
            )}
          </div>
        }
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : isError ? (
        <ErrorState
          title={t("bookshelvesPage.loadErrorTitle")}
          description={t("bookshelvesPage.loadErrorDesc")}
          action={
            <Button variant="outline" className="gap-1.5" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" /> {t("bookshelvesPage.retry")}
            </Button>
          }
        />
      ) : !bookshelves || bookshelves.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title={t("bookshelvesPage.emptyTitle")}
          description={t("bookshelvesPage.emptyDesc")}
        />
      ) : (
        <div
          className={
            view === "grid"
              ? "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2.5"
          }
        >
          {bookshelves.map((b) => {
            const n = counts[b.slug] || 0;
            const c = SHELF_PALETTE[b.slug] ?? SHELF_PALETTE.other;
            const bars = 5;
            const filled = Math.max(1, Math.min(bars, Math.ceil(n / 3)));
            const countLabel = t(
              n === 1 ? "bookshelvesPage.itemCount" : "bookshelvesPage.itemCountPlural",
              { n },
            );
            if (view === "list") {
              return (
                <Link
                  key={b.slug}
                  to="/bookshelves/$slug"
                  params={{ slug: b.slug }}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${c.bg} ${c.fg}`}
                  >
                    <Library className="h-4 w-4" />
                  </div>
                  <h3 className="min-w-0 flex-1 truncate font-display text-sm font-semibold leading-tight text-foreground group-hover:text-primary">
                    {b.label}
                  </h3>
                  <span className={`shrink-0 text-xs font-medium tabular-nums ${c.fg}`}>
                    {countLabel}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={b.slug}
                to="/bookshelves/$slug"
                params={{ slug: b.slug }}
                className="group rounded-2xl border border-border bg-card p-3.5 sm:p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl ${c.bg} ${c.fg}`}
                  >
                    <Library className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-[15px] sm:text-base font-semibold leading-tight text-foreground group-hover:text-primary">
                      {b.label}
                    </h3>
                    <p className={`mt-0.5 text-[11px] sm:text-xs font-medium tabular-nums ${c.fg}`}>
                      {countLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 sm:mt-4 flex items-center gap-1.5">
                  {Array.from({ length: bars }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 sm:h-2 flex-1 rounded-full ${i < filled ? c.bar : "bg-muted"}`}
                    />
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
