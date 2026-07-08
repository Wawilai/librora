import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { adapter, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/librora/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search as SearchIcon, Sparkles } from "lucide-react";
import { PremiumLockState } from "@/components/librora/premium-lock";
import { EmptyState, ErrorState } from "@/components/librora/shared-states";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/librora/status-badge";
import { TagChip } from "@/components/librora/tag-chip";
import { bookshelfLabel } from "@/lib/bookshelves";
import type { LibraryItem } from "@/lib/api/types";
import { z } from "zod";
import { useT } from "@/lib/i18n";

const SearchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_app/search")({
  head: () => ({ meta: [{ title: "Search — Librora" }] }),
  validateSearch: SearchSchema,
  component: SearchPage,
});

function SearchPage() {
  const t = useT();
  const { q } = Route.useSearch();
  const user = useStore((s) => s.user);
  const [input, setInput] = useState(q ?? "");
  const [mode, setMode] = useState<"keyword" | "semantic">("keyword");
  const [keywordResults, setKeywordResults] = useState<LibraryItem[]>([]);
  const [semanticResults, setSemanticResults] = useState<{ item: LibraryItem; score: number }[]>(
    [],
  );
  const [loading, setLoading] = useState<"keyword" | "semantic" | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [semanticError, setSemanticError] = useState<string | null>(null);
  const [semanticUnavailable, setSemanticUnavailable] = useState(false);
  const navigate = Route.useNavigate();
  const activeLoading = loading === mode;

  useEffect(() => {
    setInput(q ?? "");
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: { q: input.trim() || undefined } });
  };

  useEffect(() => {
    const query = (q ?? "").trim();
    setKeywordError(null);
    if (!query) {
      setKeywordResults([]);
      return;
    }
    let cancelled = false;
    setLoading("keyword");
    adapter.search
      .keyword(query, 50)
      .then((res) => {
        if (!cancelled) setKeywordResults(res.items);
      })
      .catch((err) => {
        if (!cancelled)
          setKeywordError(err instanceof Error ? err.message : t("searchPage.searchFailedTitle"));
      })
      .finally(() => {
        if (!cancelled) setLoading((current) => (current === "keyword" ? null : current));
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  useEffect(() => {
    const query = (q ?? "").trim();
    setSemanticError(null);
    setSemanticUnavailable(false);
    if (!query || mode !== "semantic") {
      if (!query) setSemanticResults([]);
      return;
    }
    if (user.plan === "free") {
      setSemanticUnavailable(true);
      setSemanticResults([]);
      return;
    }
    let cancelled = false;
    setLoading("semantic");
    adapter.search
      .semantic(query, 10)
      .then((res) => {
        if (!cancelled) {
          setSemanticResults(
            res.items.map((item, index) => ({ item, score: res.scores[index] ?? 0 })),
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "PLAN_FEATURE_NOT_AVAILABLE") {
          setSemanticUnavailable(true);
          setSemanticResults([]);
          return;
        }
        setSemanticError(err instanceof Error ? err.message : t("searchPage.semanticFailedTitle"));
      })
      .finally(() => {
        if (!cancelled) setLoading((current) => (current === "semantic" ? null : current));
      });
    return () => {
      cancelled = true;
    };
  }, [mode, q, user.plan]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("searchPage.title")}
        description={t("searchPage.description")}
        icon={<SearchIcon className="h-5 w-5" />}
      />

      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <div className="mb-3">
          <TabsList>
            <TabsTrigger value="keyword">{t("searchPage.keywordTab")}</TabsTrigger>
            <TabsTrigger value="semantic">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t("searchPage.semanticTab")}
            </TabsTrigger>
          </TabsList>
        </div>

        <form onSubmit={submit} className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("searchPage.inputPlaceholder")}
              className="h-11 pl-10 text-base"
            />
          </div>
          <Button type="submit" className="h-11 min-w-28 px-5" disabled={activeLoading}>
            {activeLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("searchPage.searchingButton")}
              </>
            ) : (
              t("searchPage.searchButton")
            )}
          </Button>
        </form>

        <TabsContent value="keyword" className="mt-5">
          {!q ? (
            <EmptyState
              title={t("searchPage.keywordEmptyTitle")}
              description={t("searchPage.keywordEmptyDesc")}
            />
          ) : loading === "keyword" ? (
            <SearchLoadingState />
          ) : keywordError ? (
            <ErrorState title={t("searchPage.searchFailedTitle")} description={keywordError} />
          ) : keywordResults.length === 0 ? (
            <EmptyState
              title={t("searchPage.noResultsTitle", { q: q ?? "" })}
              description={t("searchPage.noResultsDesc")}
            />
          ) : (
            <div className="space-y-2">
              {keywordResults.map((i) => (
                <ResultRow key={i.id} item={i} query={q} isPremium={user.plan === "premium"} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="semantic" className="mt-5">
          {semanticUnavailable ? (
            <PremiumLockState
              feature={t("searchPage.semanticFeature")}
              description={t("searchPage.semanticLockedDesc")}
              secondaryAction={
                <Button variant="ghost" size="sm" onClick={() => setMode("keyword")}>
                  {t("searchPage.continueWithKeyword")}
                </Button>
              }
            />
          ) : !q ? (
            <EmptyState
              title={t("searchPage.semanticEmptyTitle")}
              description={t("searchPage.semanticEmptyDesc")}
            />
          ) : loading === "semantic" ? (
            <SearchLoadingState />
          ) : semanticError ? (
            <ErrorState title={t("searchPage.semanticFailedTitle")} description={semanticError} />
          ) : semanticResults.length === 0 ? (
            <EmptyState
              title={t("searchPage.noCloseMatchesTitle", { q: q ?? "" })}
              description={t("searchPage.noCloseMatchesDesc")}
            />
          ) : (
            <div className="space-y-2">
              {semanticResults.map(({ item, score }) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  query={q}
                  score={score}
                  isPremium={user.plan === "premium"}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchLoadingState() {
  const t = useT();
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/60 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">{t("searchPage.searchingTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("searchPage.searchingDesc")}</p>
    </div>
  );
}

function ResultRow({
  item,
  query,
  score,
  isPremium,
}: {
  item: LibraryItem;
  query?: string;
  score?: number;
  isPremium: boolean;
}) {
  const t = useT();
  const isReady = item.status === "ready" || item.status === "partial";
  return (
    <Link
      to={isReady ? "/read/$itemId" : "/inbox"}
      params={isReady ? { itemId: item.id } : undefined}
      className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30"
    >
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid h-5 w-5 place-items-center rounded border border-border bg-background font-display text-[10px]">
          {item.faviconLetter}
        </span>
        <span className="truncate">{item.domain}</span>
        <span>·</span>
        <StatusBadge status={item.status} />
        {typeof score === "number" && (
          <span className="ml-auto rounded-full bg-[color-mix(in_oklab,var(--ai)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ai)]">
            {t("searchPage.matchPercent", { percent: Math.round(score * 100) })}
          </span>
        )}
      </div>
      <h3 className="font-display text-base font-medium text-foreground">
        <Highlight text={item.title} q={query} />
      </h3>
      {isPremium && item.aiAbstract && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          <Highlight text={item.aiAbstract} q={query} />
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {item.bookshelf && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
            {bookshelfLabel(item.bookshelf)}
          </span>
        )}
        {item.tags.slice(0, 4).map((t) => (
          <TagChip key={t} tag={t} />
        ))}
      </div>
    </Link>
  );
}

function Highlight({ text, q }: { text: string; q?: string }) {
  if (!q) return <>{text}</>;
  const tokens = q
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`(${tokens.map(esc).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) ? (
          <mark
            key={i}
            className="rounded-sm bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] px-0.5 text-foreground"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function esc(s: string) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
