import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { adapter, ApiError } from "@/lib/api";
import { QuotaExceededBlock } from "@/components/librora/shared-states";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  WifiOff,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";
import type { LibraryItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const MAX_URL_LENGTH = 2048;

type UrlError =
  | { kind: "empty"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "protocol"; message: string }
  | { kind: "too-long"; message: string };

type FormError = { kind: "network"; message: string };

function validateUrl(
  raw: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): { url?: string; error?: UrlError } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: { kind: "empty", message: t("addDialog.urlEmpty") } };
  if (trimmed.length > MAX_URL_LENGTH)
    return {
      error: { kind: "too-long", message: t("addDialog.urlTooLong", { max: MAX_URL_LENGTH }) },
    };

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { error: { kind: "invalid", message: t("addDialog.urlInvalid") } };
  }
  if (!/^https?:$/.test(parsed.protocol))
    return {
      error: { kind: "protocol", message: t("addDialog.urlProtocol") },
    };
  if (!parsed.hostname.includes("."))
    return { error: { kind: "invalid", message: t("addDialog.urlDomain") } };
  return { url: parsed.toString() };
}

export function AddToLibraryDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [urlError, setUrlError] = useState<UrlError | null>(null);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<LibraryItem | null>(null);

  const addItem = useStore((s) => s.addItem);
  const navigate = useNavigate();
  const t = useT();
  const tStr = t as unknown as (k: string, v?: Record<string, string | number>) => string;

  const quotaResetLabel = (() => {
    const now = new Date();
    const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return reset.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  })();

  const reset = () => {
    setUrl("");
    setTitle("");
    setNote("");
    setTagInput("");
    setShowOptional(false);
    setUrlError(null);
    setFormError(null);
    setQuotaBlocked(false);
    setDuplicate(null);
    setSubmitting(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setQuotaBlocked(false);
    setDuplicate(null);

    const { url: normalized, error } = validateUrl(url, tStr);
    if (error || !normalized) {
      setUrlError(error ?? { kind: "invalid", message: t("addDialog.urlInvalid") });
      return;
    }
    setUrlError(null);

    setSubmitting(true);

    try {
      const existing = await adapter.items.checkExisting(normalized);
      if (existing.exists) {
        setDuplicate(existing.item);
        setSubmitting(false);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "ITEM_DUPLICATE") {
        const existingItem = (err.details as { item?: LibraryItem } | null)?.item;
        if (existingItem) {
          setDuplicate(existingItem);
          setSubmitting(false);
          return;
        }
      }
      setFormError({ kind: "network", message: t("addDialog.networkError") });
      setSubmitting(false);
      return;
    }

    const tags = tagInput
      .split(",")
      .map((tg) => tg.trim().toLowerCase())
      .filter(Boolean);

    addItem({
      url: normalized,
      customTitle: title.trim() || undefined,
      note: note.trim() || undefined,
      tags,
    });

    toast.success(t("toasts.addedToLibrary"), {
      description: t("toasts.addedToLibraryDesc"),
    });

    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5" aria-label={t("addDialog.ariaAdd")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("addDialog.addToLibrary")}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[100dvh] w-[calc(100vw-1.5rem)] gap-0 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t("addDialog.title")}</DialogTitle>
          <DialogDescription>{t("addDialog.desc")}</DialogDescription>
        </DialogHeader>

        {duplicate ? (
          <DuplicateView
            item={duplicate}
            onOpen={() => {
              const isReady = duplicate.status === "ready" || duplicate.status === "partial";
              if (isReady) {
                navigate({ to: "/read/$itemId", params: { itemId: duplicate.id } });
              } else {
                navigate({ to: "/inbox" });
              }
              setOpen(false);
              reset();
            }}
            onClose={() => {
              setOpen(false);
              reset();
            }}
          />
        ) : quotaBlocked ? (
          <div className="mt-4 space-y-4">
            <QuotaExceededBlock
              label="Quota"
              used={0}
              limit={0}
              resetLabel={quotaResetLabel}
              alternative={t("addDialog.quotaError")}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("addDialog.cancel")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            {formError && (
              <Banner
                tone="warning"
                icon={
                  formError.kind === "network" ? (
                    <WifiOff className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )
                }
              >
                {formError.message}
              </Banner>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="url">{t("addDialog.urlLabel")}</Label>
              <Input
                id="url"
                autoFocus
                inputMode="url"
                placeholder={t("addDialog.urlPlaceholder")}
                value={url}
                disabled={submitting}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                aria-invalid={!!urlError}
                aria-describedby={urlError ? "url-err" : undefined}
              />
              {urlError && (
                <p id="url-err" className="text-xs font-medium text-destructive">
                  {urlError.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showOptional ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {t("addDialog.showOptional")}
            </button>

            {showOptional && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs">
                    {t("addDialog.customTitle")}
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    disabled={submitting}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tags" className="text-xs">
                    {t("addDialog.tagsLabel")}
                  </Label>
                  <Input
                    id="tags"
                    placeholder={t("addDialog.tagsPlaceholder")}
                    value={tagInput}
                    disabled={submitting}
                    onChange={(e) => setTagInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note" className="text-xs">
                    {t("addDialog.noteLabel")}
                  </Label>
                  <Textarea
                    id="note"
                    rows={3}
                    value={note}
                    disabled={submitting}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("addDialog.notePlaceholder")}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                {t("addDialog.cancel")}
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("addDialog.submitting")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("addDialog.submit")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DuplicateView({
  item,
  onOpen,
  onClose,
}: {
  item: LibraryItem;
  onOpen: () => void;
  onClose: () => void;
}) {
  const isReady = item.status === "ready" || item.status === "partial";
  const t = useT();
  return (
    <div className="mt-4 space-y-4">
      <Banner tone="info" icon={<AlertCircle className="h-4 w-4" />}>
        {t("addDialog.duplicateNotice")}
      </Banner>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="grid h-6 w-6 place-items-center rounded-md border border-border bg-background font-display text-[10px] font-medium text-foreground/70">
            {item.faviconLetter}
          </div>
          <span className="truncate">{item.domain}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>
            {t("addDialog.savedAgo", {
              when: formatDistanceToNow(new Date(item.addedAt), { addSuffix: true }),
            })}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-base font-medium text-foreground">
          {item.title}
        </h3>
        {!isReady && (
          <p className="mt-2 text-xs text-muted-foreground">{t("addDialog.pendingNote")}</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t("addDialog.closeBtn")}
        </Button>
        <Button onClick={onOpen} className="gap-1.5">
          {isReady ? (
            <>
              <BookOpen className="h-4 w-4" />
              {t("addDialog.openExisting")}
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              {t("addDialog.viewInInbox")}
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "info" | "warning" | "success";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        tone === "warning" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        tone === "info" && "border-primary/30 bg-primary/10 text-foreground",
        tone === "success" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
