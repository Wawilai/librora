import { Link } from "@tanstack/react-router";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Loader2,
  Pencil,
  RefreshCcw,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast as sonner } from "sonner";
import type { LibraryItem } from "@/lib/api/types";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Generic List States: Empty / Error / Loading                              */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const t = useT();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <h3 className="font-display text-base font-medium text-destructive">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-border bg-card/60"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Generic Error State (named-error variant w/ retry + i18n)                 */
/* -------------------------------------------------------------------------- */

export function GenericError({
  title,
  description,
  onRetry,
  alternative,
  errorRef,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  alternative?: ReactNode;
  errorRef?: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <h3 className="mt-3 font-display text-base font-medium text-foreground">
        {title ?? t("states.errorTitle")}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        {description ?? t("states.errorDesc")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t("common.retry")}
          </Button>
        )}
        {alternative ?? (
          <Button asChild size="sm" variant="outline">
            <Link to="/library">{t("states.backToLibrary")}</Link>
          </Button>
        )}
      </div>
      {errorRef && (
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          {t("states.refId", { id: errorRef })}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Item-state Cards: Processing / Partial / Failed                           */
/* -------------------------------------------------------------------------- */

function ItemHeader({ item }: { item: LibraryItem }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="grid h-5 w-5 place-items-center rounded border border-border bg-background font-display text-[10px] text-foreground/70">
        {item.faviconLetter}
      </span>
      <span className="truncate">{item.domain}</span>
    </div>
  );
}

export function ProcessingItemBlock({ item }: { item: LibraryItem }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <ItemHeader item={item} />
      <h3 className="mt-2 font-display text-base font-medium text-foreground">
        {item.title || item.url}
      </h3>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--status-processing)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-processing)]">
        <Loader2 className="h-3 w-3 animate-spin" /> {t("states.processing")}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("states.processingDesc")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {t("states.openSource")}
          </a>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/read/$itemId" params={{ itemId: item.id }}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("states.openDetails")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function PartialItemBlock({
  item,
  available,
  unavailable,
  onReprocess,
  onEdit,
  canReprocess = true,
}: {
  item: LibraryItem;
  available: string[];
  unavailable: string[];
  onReprocess?: () => void;
  onEdit?: () => void;
  canReprocess?: boolean;
}) {
  const t = useT();
  return (
    <div className="rounded-xl border border-[var(--status-partial)]/30 bg-[color-mix(in_oklab,var(--status-partial)_6%,var(--card))] p-5">
      <ItemHeader item={item} />
      <h3 className="mt-2 font-display text-base font-medium text-foreground">
        {item.title || item.url}
      </h3>
      <p className="mt-2 text-sm text-[var(--status-partial)]">{t("states.partial")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("states.available")}
          </div>
          <ul className="mt-1.5 space-y-1 text-sm text-foreground/80">
            {available.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("states.unavailable")}
          </div>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {unavailable.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canReprocess && onReprocess && (
          <Button size="sm" onClick={onReprocess}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t("states.reprocess")}
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("states.editDetails")}
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {t("states.openSource")}
          </a>
        </Button>
      </div>
    </div>
  );
}

export function FailedItemBlock({
  item,
  isPremium,
  onEdit,
  onReprocess,
  onDelete,
}: {
  item: LibraryItem;
  isPremium?: boolean;
  onEdit?: () => void;
  onReprocess?: () => void;
  onDelete?: () => void;
}) {
  const t = useT();

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <ItemHeader item={item} />
      <h3 className="mt-2 font-display text-base font-medium text-foreground">
        {item.title || item.url}
      </h3>
      <p className="mt-2 text-sm text-destructive">{t("states.failed")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("states.failedHint")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {t("states.openSource")}
          </a>
        </Button>
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("common.edit")}
          </Button>
        )}
        {isPremium && onReprocess && (
          <Button size="sm" onClick={onReprocess}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t("states.reprocess")}
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("common.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quota / Offline                                                           */
/* -------------------------------------------------------------------------- */

export function QuotaExceededBlock({
  label,
  used,
  limit,
  resetLabel,
  alternative,
}: {
  label: string;
  used: number;
  limit: number;
  resetLabel: string;
  alternative: string;
}) {
  const t = useT();

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-base font-medium text-foreground">
            {t("states.quotaTitle", { label })}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("states.quotaUsed", {
              used: used.toLocaleString(),
              limit: limit.toLocaleString(),
              reset: resetLabel,
            })}
          </p>
          <p className="mt-2 text-sm text-foreground/80">{alternative}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/plan">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t("states.seePlan")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  const t = useT();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--status-partial)]/30 bg-[color-mix(in_oklab,var(--status-partial)_8%,transparent)] px-4 py-3 text-sm">
      <WifiOff className="mt-0.5 h-4 w-4 text-[var(--status-partial)]" />
      <div className="flex-1">
        <div className="font-medium text-foreground">{t("states.offlineTitle")}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("states.offlineHint")}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCcw className="mr-1.5 h-3 w-3" /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation Dialogs                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Shared destructive confirmation for a Library Item.
 * Use this everywhere instead of building bespoke dialogs.
 */
export function DeleteItemConfirm({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const t = useT();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.deleteItemTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("dialogs.deleteItemDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("dialogs.deleteItem")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteTagConfirm({
  open,
  onOpenChange,
  tag,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tag: string;
  onConfirm: () => void;
}) {
  const t = useT();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.deleteTagTitle", { tag })}</AlertDialogTitle>
          <AlertDialogDescription>{t("dialogs.deleteTagDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("dialogs.deleteTag")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirm dialog for navigating away with unsaved changes. */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onKeepEditing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDiscard: () => void;
  onKeepEditing?: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogs.unsavedTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.unsavedDesc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onKeepEditing?.();
            }}
          >
            {t("dialogs.keepEditing")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onDiscard();
            }}
          >
            {t("dialogs.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toast helpers — standardize messages & actions                            */
/* -------------------------------------------------------------------------- */

export const toast = {
  /** "Saved" success toast — short, neutral. */
  saveSuccess(message = "บันทึกแล้ว", description?: string) {
    sonner.success(message, { description });
  },
  /** Archive toast with Undo affordance. */
  archived(title: string, undo: () => void) {
    sonner("เก็บเข้าคลังแล้ว", {
      description: title,
      action: { label: "เลิกทำ", onClick: undo },
      duration: 5000,
    });
  },
  /** Generic recoverable error toast. */
  error(message = "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง", onRetry?: () => void) {
    sonner.error(
      message,
      onRetry ? { action: { label: "ลองอีกครั้ง", onClick: onRetry } } : undefined,
    );
  },
  /** Pass-through for ad-hoc messages. */
  raw: sonner,
};

/* -------------------------------------------------------------------------- */
/*  Convenience hook — call onArchive with Undo                               */
/* -------------------------------------------------------------------------- */

export function useArchiveWithUndo() {
  const archive = useStore((s) => s.archive);
  const restore = useStore((s) => s.restore);
  return (id: string, title: string) => {
    archive(id);
    toast.archived(title, () => restore(id));
  };
}
