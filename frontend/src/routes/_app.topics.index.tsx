import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore, useVisibleItems } from "@/lib/store";
import { PageHeader } from "@/components/librora/page-header";
import { SearchInput } from "@/components/librora/search-input";
import { SegmentedControl } from "@/components/librora/segmented-control";
import { Tags, Hash, Pencil, Trash2, Sparkles, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  DeleteTagConfirm,
} from "@/components/librora/shared-states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Sort = "name" | "usage";

export const Route = createFileRoute("/_app/topics/")({
  head: () => ({ meta: [{ title: "Topics - Librora" }] }),
  component: TopicsPage,
});

function looksAiGenerated(tag: string): boolean {
  if (tag.includes("-") && tag.length >= 8) return true;
  return false;
}

function TopicsPage() {
  const t = useT();
  const items = useVisibleItems();
  const renameTag = useStore((s) => s.renameTag);
  const deleteTag = useStore((s) => s.deleteTag);
  const navigate = useNavigate();

  const stateParam = null;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("usage");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) for (const tag of i.tags) map.set(tag, (map.get(tag) || 0) + 1);
    let list = [...map.entries()].map(([tag, count]) => ({ tag, count }));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((entry) => entry.tag.toLowerCase().includes(q));
    }
    list.sort((a, b) =>
      sort === "name"
        ? a.tag.localeCompare(b.tag)
        : b.count - a.count || a.tag.localeCompare(b.tag),
    );
    return list;
  }, [items, query, sort]);

  const handleRename = () => {
    if (!renaming) return;
    const next = renameValue.trim();
    if (!next) return;
    renameTag(renaming, next);
    toast.success(t("topicsPage.renamedToast", { tag: next.toLowerCase().replace(/\s+/g, "-") }));
    setRenaming(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const tag = deleting;
    deleteTag(tag);
    setDeleting(null);
    toast.success(t("topicsPage.deletedToast", { tag }));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("topicsPage.title")}
        description={t("topicsPage.description")}
        icon={<Tags className="h-5 w-5" />}
      />

      {stateParam === "loading" ? (
        <LoadingSkeleton rows={6} />
      ) : stateParam === "error" ? (
        <ErrorState
          title={t("topicsPage.loadErrorTitle")}
          description={t("topicsPage.loadErrorDesc")}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/topics" })}>
              {t("topicsPage.retry")}
            </Button>
          }
        />
      ) : tags.length === 0 && !query ? (
        <EmptyState
          icon={<Tags className="h-5 w-5" />}
          title={t("topicsPage.emptyTitle")}
          description={t("topicsPage.emptyDesc")}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:max-w-sm sm:flex-1">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery("")}
                placeholder={t("topicsPage.searchPlaceholder")}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("topicsPage.sortBy")}</span>
              <SegmentedControl
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                options={[
                  { value: "usage", label: t("topicsPage.sortUsage") },
                  { value: "name", label: t("topicsPage.sortName") },
                ]}
              />
            </div>
          </div>

          {tags.length === 0 ? (
            <EmptyState
              title={t("topicsPage.noMatchTitle")}
              description={t("topicsPage.noMatchDesc")}
              action={
                <Button size="sm" variant="outline" onClick={() => setQuery("")}>
                  {t("topicsPage.clearSearch")}
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {tags.map(({ tag, count }) => {
                const ai = looksAiGenerated(tag);
                return (
                  <li
                    key={tag}
                    className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:px-4"
                  >
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/topics/$slug", params: { slug: tag } })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium text-foreground">{tag}</span>
                      {ai && (
                        <span
                          title={t("topicsPage.aiTagTitle")}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                        >
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </span>
                      )}
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {t("topicsPage.itemCount", { n: count })}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${t("topicsPage.renameTag")} ${tag}`}
                        onClick={() => {
                          setRenaming(tag);
                          setRenameValue(tag);
                        }}
                        className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t("topicsPage.deleteTag")} ${tag}`}
                        onClick={() => setDeleting(tag)}
                        className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t("topicsPage.openTag")} ${tag}`}
                        onClick={() => navigate({ to: "/topics/$slug", params: { slug: tag } })}
                        className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("topicsPage.renameDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("topicsPage.renameDialogDesc", { tag: renaming ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            placeholder={t("topicsPage.renamePlaceholder")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteTagConfirm
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tag={deleting ?? ""}
        onConfirm={handleDelete}
      />
    </div>
  );
}
