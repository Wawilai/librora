import { createFileRoute } from "@tanstack/react-router";
import { useStore, useVisibleItems } from "@/lib/store";
import { LibraryItemCard } from "@/components/librora/library-item-card";
import { PageHeader } from "@/components/librora/page-header";
import { EmptyState } from "@/components/librora/shared-states";
import { AddToLibraryDialog } from "@/components/librora/add-to-library-dialog";
import { Inbox, RefreshCcw, RotateCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/librora/status-badge";
import { formatDistanceToNow } from "date-fns";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({ meta: [{ title: "Library Inbox — Librora" }] }),
  component: InboxPage,
});

function InboxPage() {
  const t = useT();
  const items = useVisibleItems();
  const retry = useStore((s) => s.retry);
  const reprocess = useStore((s) => s.reprocess);

  const processing = items.filter((i) => i.status === "processing" || i.status === "pending");
  const needsAttention = items.filter((i) => i.status === "failed" || i.status === "partial");
  const recent = [...items]
    .filter((i) => i.status === "ready")
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("inbox.title")}
        description={t("inbox.description")}
        actions={<AddToLibraryDialog />}
      />

      <Section title={t("inbox.processing")} count={processing.length}>
        {processing.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inbox.processingEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {processing.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background font-display text-xs">
                  {i.faviconLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{i.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {i.domain} · added{" "}
                    {formatDistanceToNow(new Date(i.addedAt), { addSuffix: true })}
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("inbox.needsAttention")} count={needsAttention.length} tone="warn">
        {needsAttention.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inbox.needsAttentionEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {needsAttention.map((i) => (
              <div
                key={i.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={i.status} />
                    <span className="truncate text-sm font-medium text-foreground">{i.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i.failureReason || i.partialReason}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(i.url, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {t("inbox.original")}
                  </Button>
                  {i.sourceType !== "google_doc" &&
                    (i.status === "failed" ? (
                      <Button size="sm" onClick={() => retry(i.id)}>
                        <RotateCw className="mr-1.5 h-3.5 w-3.5" /> {t("inbox.retry")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => reprocess(i.id)}>
                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t("inbox.reprocess")}
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("inbox.recentlyAdded")} count={recent.length}>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title={t("inbox.emptyTitle")}
            description={t("inbox.emptyDesc")}
            action={<AddToLibraryDialog />}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((i) => (
              <LibraryItemCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  tone = "neutral",
  children,
}: {
  title: string;
  count?: number;
  tone?: "neutral" | "warn";
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-lg font-medium text-foreground">{title}</h2>
        {typeof count === "number" && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              tone === "warn"
                ? "bg-[color-mix(in_oklab,var(--status-partial)_15%,transparent)] text-[var(--status-partial)]"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
