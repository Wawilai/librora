import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useStore, useVisibleItems } from "@/lib/store";
import { LibraryItemCard } from "@/components/librora/library-item-card";
import { PageHeader } from "@/components/librora/page-header";
import { SearchInput } from "@/components/librora/search-input";
import { ChevronLeft, Hash, Pencil, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/_app/topics/$slug")({
  head: ({ params }) => ({ meta: [{ title: `#${params.slug} - Librora` }] }),
  component: TopicDetail,
});

function TopicDetail() {
  const { slug } = useParams({ from: "/_app/topics/$slug" });
  const t = useT();
  const navigate = useNavigate();
  const all = useVisibleItems();
  const renameTag = useStore((s) => s.renameTag);
  const deleteTag = useStore((s) => s.deleteTag);

  const stateParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("state") : null;

  const [query, setQuery] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(slug);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tagged = useMemo(() => all.filter((i) => i.tags.includes(slug)), [all, slug]);
  const filtered = useMemo(() => {
    if (!query.trim()) return tagged;
    const q = query.trim().toLowerCase();
    return tagged.filter((i) =>
      [i.title, i.extractedTitle, i.description, i.url, i.personalNote]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }, [tagged, query]);

  const handleRename = () => {
    const next = renameValue.trim();
    if (!next || next === slug) {
      setRenameOpen(false);
      return;
    }
    renameTag(slug, next);
    const normalized = next.toLowerCase().replace(/\s+/g, "-");
    toast.success(t("topicsPage.renamedToast", { tag: normalized }));
    setRenameOpen(false);
    navigate({ to: "/topics/$slug", params: { slug: normalized } });
  };

  const handleDelete = () => {
    deleteTag(slug);
    toast.success(t("topicsPage.deletedToast", { tag: slug }));
    navigate({ to: "/topics" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/topics"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {t("topicsPage.allTopics")}
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={`#${slug}`}
          description={t("topicsPage.topicDescription", { n: tagged.length })}
          icon={<Hash className="h-5 w-5" />}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRenameValue(slug);
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t("topicsPage.rename")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("topicsPage.delete")}
          </Button>
        </div>
      </div>

      {tagged.length > 0 && (
        <div className="mb-4 sm:max-w-sm">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={t("topicsPage.searchWithin", { tag: slug })}
            size="sm"
          />
        </div>
      )}

      {stateParam === "loading" ? (
        <LoadingSkeleton rows={3} />
      ) : stateParam === "error" ? (
        <ErrorState
          title={t("topicsPage.loadItemsErrorTitle")}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: "/topics/$slug", params: { slug } })}
            >
              {t("topicsPage.retry")}
            </Button>
          }
        />
      ) : tagged.length === 0 ? (
        <EmptyState
          title={t("topicsPage.tagEmptyTitle")}
          description={t("topicsPage.tagEmptyDesc")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("topicsPage.noItemMatchTitle")}
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              {t("topicsPage.clearSearch")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <LibraryItemCard key={i.id} item={i} />
          ))}
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("topicsPage.renameDialogTitle")}</DialogTitle>
            <DialogDescription>{t("topicsPage.renameDialogDesc", { tag: slug })}</DialogDescription>
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
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteTagConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tag={slug}
        onConfirm={handleDelete}
      />
    </div>
  );
}
