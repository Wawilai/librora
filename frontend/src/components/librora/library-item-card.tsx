import { Link, useNavigate } from "@tanstack/react-router";
import type { LibraryItem } from "@/lib/api/types";
import { StatusBadge } from "./status-badge";
import { TagChip } from "./tag-chip";
import { bookshelfLabel } from "@/lib/bookshelves";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteItemConfirm } from "./shared-states";
import { useStore } from "@/lib/store";
import { adapter } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ExternalLink,
  MoreHorizontal,
  Archive,
  Trash2,
  RefreshCcw,
  RotateCw,
  Pencil,
  Download,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { EditItemDialog } from "./edit-item-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useT } from "@/lib/i18n";

export function LibraryItemCard({
  item,
  variant = "grid",
}: {
  item: LibraryItem;
  variant?: "grid" | "list";
}) {
  const navigate = useNavigate();
  const { toggleReadingList, archive, remove, reprocess, retry, user } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const t = useT();

  const isReady = item.status === "ready" || item.status === "partial";
  const showAiAbstract = user.plan === "premium" && !!item.aiAbstract;

  const open = () => {
    if (isReady) navigate({ to: "/read/$itemId", params: { itemId: item.id } });
  };

  const onExport = async (format: "md" | "epub") => {
    toast(t("itemCard.exportStarted"));
    try {
      const blob = await adapter.items.exportOne(item.id, format);
      downloadBlob(blob, `${item.title}.${format}`);
    } catch {
      toast.error(t("itemCard.exportFailed"));
    }
  };

  const onArchive = () => {
    archive(item.id);
    toast(t("toasts.archived"), {
      description: item.title,
      action: {
        label: t("common.undo"),
        onClick: () => useStore.getState().restore(item.id),
      },
      duration: 5000,
    });
  };

  return (
    <>
      <article
        className={`group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-soft)] ${
          variant === "list" ? "sm:flex-row sm:items-start sm:gap-5 sm:p-5" : ""
        }`}
      >
        <button
          type="button"
          onClick={open}
          disabled={!isReady}
          className="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default"
          aria-label={t("itemCard.openAria", { title: item.title })}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-background font-display text-xs font-medium text-foreground/70">
            {item.faviconLetter}
          </div>
          <span className="truncate text-xs text-muted-foreground">{item.domain}</span>
          <div className="ml-auto flex items-center gap-2">
            {item.sourceType === "google_doc" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <FileText className="h-3 w-3" />
                {t("itemCard.sourceTypeGoogleDoc")}
              </span>
            )}
            <StatusBadge status={item.status} />
          </div>
        </div>

        <div className="relative z-10 flex-1">
          <h3 className="line-clamp-2 font-display text-[17px] font-medium leading-snug text-foreground">
            {item.title}
          </h3>
          {showAiAbstract && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{item.aiAbstract}</p>
          )}
          {item.status === "failed" && item.failureReason && (
            <p className="mt-1.5 line-clamp-2 text-sm text-[var(--status-failed)]">
              {item.failureReason}
            </p>
          )}
          {item.status === "partial" && item.partialReason && (
            <p className="mt-1.5 line-clamp-2 text-sm text-[var(--status-partial)]">
              {item.partialReason}
            </p>
          )}
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {item.bookshelf && (
            <Link
              to="/bookshelves/$slug"
              params={{ slug: item.bookshelf }}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground hover:bg-accent"
            >
              {bookshelfLabel(item.bookshelf)}
            </Link>
          )}
          {item.tags.slice(0, 3).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
          {item.tags.length > 3 && (
            <span className="text-[11px] text-muted-foreground">+{item.tags.length - 3}</span>
          )}
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}</span>
          <div className="flex items-center gap-1">
            {isReady && (
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 after:absolute after:-inset-1"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                aria-label={t("itemCard.openInReadingRoom")}
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 after:absolute after:-inset-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleReadingList(item.id);
                toast(
                  item.inReadingList
                    ? t("toasts.removedFromReadingList")
                    : t("toasts.addedToReadingList"),
                );
              }}
              aria-label={t("itemCard.toggleReadingList")}
            >
              {item.inReadingList ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 after:absolute after:-inset-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(item.url, "_blank", "noopener,noreferrer");
              }}
              aria-label={t("itemCard.openOriginal")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 after:absolute after:-inset-1"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t("itemCard.moreActions")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {item.status === "failed" && item.sourceType !== "google_doc" && (
                  <DropdownMenuItem onClick={() => retry(item.id)}>
                    <RotateCw className="mr-2 h-4 w-4" /> {t("itemCard.retry")}
                  </DropdownMenuItem>
                )}
                {(item.status === "partial" || item.status === "ready") &&
                  item.sourceType !== "google_doc" && (
                    <DropdownMenuItem onClick={() => reprocess(item.id)}>
                      <RefreshCcw className="mr-2 h-4 w-4" /> {t("itemCard.reprocess")}
                    </DropdownMenuItem>
                  )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> {t("itemCard.edit")}
                </DropdownMenuItem>
                {isReady && user.plan === "premium" && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Download className="mr-2 h-4 w-4" /> {t("itemCard.export")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => void onExport("md")}>
                        {t("itemCard.exportMd")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void onExport("epub")}>
                        {t("itemCard.exportEpub")}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" /> {t("itemCard.archive")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {t("itemCard.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </article>

      <DeleteItemConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          remove(item.id);
          toast(t("toasts.itemDeleted"));
        }}
      />
      <EditItemDialog item={item} open={editing} onOpenChange={setEditing} />
    </>
  );
}
