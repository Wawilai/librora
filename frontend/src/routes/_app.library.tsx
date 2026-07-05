import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, useVisibleItems } from "@/lib/store";
import { LibraryItemCard } from "@/components/librora/library-item-card";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "@/components/librora/filter-bar";
import { PageHeader } from "@/components/librora/page-header";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/librora/shared-states";
import { AddToLibraryDialog } from "@/components/librora/add-to-library-dialog";
import { SearchInput } from "@/components/librora/search-input";
import { PremiumLockState } from "@/components/librora/premium-lock";
import { BOOKSHELVES } from "@/lib/bookshelves";
import { LibraryBig, Chrome, Plus, RefreshCcw, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useT } from "@/lib/i18n";
import { adapter } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

const searchSchema = z.object({
  q: z.string().optional(),
  state: z.enum(["loading", "error", "empty"]).optional(),
});

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "My Library — Librora" },
      { name: "description", content: "Everything you've saved, organized and recallable." },
    ],
  }),
  validateSearch: searchSchema,
  component: MyLibrary,
});

const PAGE_SIZE = 9;

function MyLibrary() {
  const { q: qParam, state: stateOverride } = Route.useSearch();
  const navigate = useNavigate({ from: "/library" });
  const items = useVisibleItems();
  const plan = useStore((s) => s.user.plan);
  const t = useT();

  const [query, setQuery] = useState(qParam ?? "");
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [exporting, setExporting] = useState(false);

  const onExportFiltered = async () => {
    setExporting(true);
    try {
      const blob = await adapter.items.exportBulk("epub", {
        ...(filters.status !== "all" ? { status: filters.status } : {}),
        ...(filters.bookshelf !== "all" ? { bookshelf: filters.bookshelf } : {}),
        ...(filters.tag && filters.tag !== "all" ? { tag: filters.tag } : {}),
        ...(filters.readingList === "only" ? { readingList: true } : {}),
        ...(query.trim() ? { query: query.trim() } : {}),
      });
      downloadBlob(blob, "librora-export.epub");
    } catch {
      toast.error(t("itemCard.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  // Reset paging when query/filters change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, filters]);

  const filtered = useMemo(() => {
    let r = items;
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter((i) => {
        const hay = [
          i.title,
          i.extractedTitle,
          i.description,
          plan === "premium" ? i.aiAbstract : undefined,
          i.domain,
          i.personalNote,
          ...(i.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filters.status !== "all") r = r.filter((i) => i.status === filters.status);
    if (filters.bookshelf !== "all") r = r.filter((i) => i.bookshelf === filters.bookshelf);
    if (filters.tag && filters.tag !== "all") r = r.filter((i) => i.tags.includes(filters.tag!));
    if (filters.readingList === "only") r = r.filter((i) => i.inReadingList);
    if (filters.date && filters.date !== "all") {
      const now = Date.now();
      const cutoff: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      };
      const max = cutoff[filters.date];
      r = r.filter((i) => now - new Date(i.addedAt).getTime() <= max);
    }
    r = [...r].sort((a, b) => {
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      if (filters.sort === "updated") {
        const da = new Date(a.processedAt ?? a.addedAt).getTime();
        const db = new Date(b.processedAt ?? b.addedAt).getTime();
        return db - da;
      }
      const da = new Date(a.addedAt).getTime();
      const db = new Date(b.addedAt).getTime();
      return filters.sort === "oldest" ? da - db : db - da;
    });
    return r;
  }, [items, query, filters, plan]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  // Top bookshelves by current item counts.
  const topShelves = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((i) => {
      if (i.bookshelf) counts.set(i.bookshelf, (counts.get(i.bookshelf) ?? 0) + 1);
    });
    return BOOKSHELVES.map((b) => ({ ...b, count: counts.get(b.slug) ?? 0 }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [items]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan === "free") return; // keyword search runs live; semantic locked
    // Semantic search route lives in /search; jump there with q.
    navigate({ to: "/search", search: { q: query } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("library.pageTitle")}
        description={t("library.pageDesc")}
        actions={<AddToLibraryDialog />}
      />

      {/* Prominent search */}
      <form onSubmit={onSearchSubmit} className="mt-2">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={t("library.searchPlaceholder")}
          className="max-w-2xl"
        />
        {plan === "free" && query.trim().length > 0 && (
          <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground">
            {t("library.keywordOnlyHint")}{" "}
            <Link
              to="/plan"
              className="inline-flex items-center gap-1 font-medium text-[var(--premium-foreground)] hover:underline"
            >
              <Sparkles className="h-3 w-3" /> {t("library.unlockSemantic")}
            </Link>{" "}
            {t("library.toFindByMeaning")}
          </p>
        )}
      </form>

      {/* Quick Smart Bookshelves */}
      {topShelves.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("library.shelves")}
          </span>
          <button
            onClick={() => setFilters({ ...filters, bookshelf: "all" })}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filters.bookshelf === "all"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("common.all")}
          </button>
          {topShelves.map((s) => (
            <button
              key={s.slug}
              onClick={() => setFilters({ ...filters, bookshelf: s.slug })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filters.bookshelf === s.slug
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
              <span className="ml-1.5 text-[10px] text-muted-foreground">{s.count}</span>
            </button>
          ))}
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link to="/bookshelves">{t("common.viewAll")}</Link>
          </Button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          view={view}
          onViewChange={setView}
          count={filtered.length}
        />
        {plan === "premium" && filtered.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void onExportFiltered()}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {exporting ? t("itemCard.exportStarted") : t("itemCard.export")}
          </Button>
        )}
      </div>

      {/* Free user inline premium lock for Semantic Search (compact, not on every card) */}
      {plan === "free" && (
        <div className="mt-4">
          <PremiumLockState
            feature={t("library.semanticTitle")}
            description={t("library.semanticDesc")}
            variant="inline"
            secondaryAction={
              <Button asChild variant="ghost" size="sm">
                <Link to="/search">{t("library.tryKeyword")}</Link>
              </Button>
            }
          />
        </div>
      )}

      {/* Content area with screen-variant overrides for review. */}
      <div className="mt-5">
        {stateOverride === "loading" ? (
          <LoadingSkeleton rows={6} />
        ) : stateOverride === "error" ? (
          <ErrorState
            title={t("library.loadError")}
            description={t("library.loadErrorDesc")}
            action={
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => navigate({ to: "/library", search: {} })}
              >
                <RefreshCcw className="h-4 w-4" /> {t("common.retry")}
              </Button>
            }
          />
        ) : stateOverride === "empty" || items.length === 0 ? (
          <EmptyLibrary />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LibraryBig className="h-5 w-5" />}
            title={t("library.noMatch")}
            description={t("library.noMatchDesc")}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ ...DEFAULT_FILTERS });
                  setQuery("");
                }}
              >
                {t("library.clearFilters")}
              </Button>
            }
          />
        ) : (
          <>
            <div
              className={
                view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"
              }
            >
              {visible.map((i) => (
                <LibraryItemCard key={i.id} item={i} variant={view} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  {t("library.loadMoreRemaining", { n: filtered.length - visible.length })}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tiny dev preview switcher for reviewing required states. */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span>{t("library.previewState")}</span>
        {(["default", "loading", "error", "empty"] as const).map((s) => (
          <Link
            key={s}
            to="/library"
            search={s === "default" ? {} : { state: s }}
            className={`rounded-full border px-2 py-0.5 ${
              (stateOverride ?? "default") === s
                ? "border-primary text-foreground"
                : "border-border hover:text-foreground"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyLibrary() {
  const t = useT();
  return (
    <EmptyState
      icon={<LibraryBig className="h-5 w-5" />}
      title={t("library.emptyTitle")}
      description={t("library.emptyDesc")}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <AddToLibraryDialog
            trigger={
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("library.addFirst")}
              </Button>
            }
          />
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/extension">
              <Chrome className="h-4 w-4" /> {t("library.installClipper")}
            </Link>
          </Button>
        </div>
      }
    />
  );
}
