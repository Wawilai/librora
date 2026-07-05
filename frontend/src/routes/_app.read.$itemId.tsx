import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/librora/status-badge";
import { TagChip } from "@/components/librora/tag-chip";
import { PremiumLockState } from "@/components/librora/premium-lock";
import { bookshelfLabel } from "@/lib/bookshelves";
import {
  ChevronLeft,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Loader2,
  Check,
  Archive,
  RefreshCcw,
  List as ListIcon,
  StickyNote,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/read/$itemId")({
  head: ({ params }) => ({ meta: [{ title: `Reading — Librora` }] }),
  component: ReadingRoom,
});

function ReadingRoom() {
  const t = useT();
  const { itemId } = useParams({ from: "/_app/read/$itemId" });
  const item = useStore((s) => s.items.find((i) => i.id === itemId));
  const user = useStore((s) => s.user);
  const setNote = useStore((s) => s.setNote);
  const toggleReadingList = useStore((s) => s.toggleReadingList);
  const archive = useStore((s) => s.archive);
  const reprocess = useStore((s) => s.reprocess);
  const retry = useStore((s) => s.retry);
  const restore = useStore((s) => s.restore);
  const navigate = useNavigate();

  const [note, setNoteLocal] = useState(item?.personalNote ?? "");
  const [save, setSave] = useState<"idle" | "saving" | "saved">("idle");
  const [activeToc, setActiveToc] = useState<string | undefined>(item?.toc?.[0]?.id);

  useEffect(() => {
    setNoteLocal(item?.personalNote ?? "");
  }, [item?.personalNote]);

  useEffect(() => {
    if (!item) return;
    if (note === (item.personalNote ?? "")) return;
    setSave("saving");
    const t = setTimeout(() => {
      setNote(item.id, note);
      setSave("saved");
      const u = setTimeout(() => setSave("idle"), 1200);
      return () => clearTimeout(u);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const contentParagraphs = useMemo(
    () => (item?.readableContent ?? "").split("\n\n").map((p, i) => ({ id: `p-${i}`, text: p })),
    [item?.readableContent],
  );

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Item not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        <Button asChild className="mt-6">
          <Link to="/library">Back to library</Link>
        </Button>
      </div>
    );
  }

  if (item.status === "pending" || item.status === "processing") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl">Still processing</h1>
        <p className="mt-2 text-muted-foreground">
          {item.title || item.url} hasn't finished processing yet. It'll be ready to read here once
          it's done.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link to="/inbox">Back to inbox</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open original source
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Couldn't process this item</h1>
        <p className="mt-2 text-muted-foreground">
          {item.failureReason || "Something went wrong while processing this item."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => retry(item.id)}>
            <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inbox">Back to inbox</Link>
          </Button>
          <Button variant="ghost" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open original source
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const aiAvailable = user.plan === "premium" && !!item.aiAbstract;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-2">
        <Link
          to="/library"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />{" "}
          <span className="hidden sm:inline">Back to library</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Mobile TOC trigger */}
          {item.toc && item.toc.length > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  aria-label="Table of contents"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Contents</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 space-y-1.5 text-sm">
                  {item.toc.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setActiveToc(h.id);
                        document
                          .getElementById(h.id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      aria-current={activeToc === h.id ? "true" : undefined}
                      className={`block w-full text-left transition-colors aria-[current=true]:font-medium aria-[current=true]:underline aria-[current=true]:underline-offset-4 ${
                        activeToc === h.id
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      } ${h.level === 2 ? "pl-3" : ""}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{h.text}</span>
                        {h.source === "ai" && (
                          <Sparkles
                            className="h-2.5 w-2.5 text-[var(--ai)]"
                            aria-label="AI-suggested"
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}

          {/* Mobile Note drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden" aria-label="Personal note">
                <StickyNote className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] max-w-md">
              <SheetHeader>
                <SheetTitle>Personal Note</SheetTitle>
              </SheetHeader>
              <Textarea
                value={note}
                onChange={(e) => setNoteLocal(e.target.value)}
                placeholder="Why did you save this? What did it change?"
                rows={10}
                className="mt-4 resize-none font-reading text-sm"
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                {save === "saving"
                  ? "Saving…"
                  : save === "saved"
                    ? "Saved"
                    : "Saved automatically. Only you can see your notes."}
              </p>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
            aria-label="Original source"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Original source</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toggleReadingList(item.id);
              toast(item.inReadingList ? "Removed from Reading List" : "Added to Reading List");
            }}
            aria-label="Reading List"
          >
            {item.inReadingList ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-primary sm:mr-1.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">Reading List</span>
          </Button>
          {item.archived ? (
            <Button size="sm" variant="outline" onClick={() => restore(item.id)}>
              Restore
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                archive(item.id);
                toast("Archived", {
                  action: { label: "Undo", onClick: () => restore(item.id) },
                  duration: 5000,
                });
                navigate({ to: "/library" });
              }}
              aria-label="Archive"
            >
              <Archive className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Archive</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contents
            </div>
            {item.toc && item.toc.length > 0 ? (
              <nav className="space-y-1.5 text-sm">
                {item.toc.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setActiveToc(h.id);
                      document
                        .getElementById(h.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    aria-current={activeToc === h.id ? "true" : undefined}
                    className={`block w-full text-left transition-colors aria-[current=true]:font-medium aria-[current=true]:underline aria-[current=true]:underline-offset-4 ${
                      activeToc === h.id
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    } ${h.level === 2 ? "pl-3" : ""}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{h.text}</span>
                      {h.source === "ai" && (
                        <Sparkles
                          className="h-2.5 w-2.5 text-[var(--ai)]"
                          aria-label="AI-suggested"
                        />
                      )}
                    </span>
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-xs text-muted-foreground">No table of contents.</p>
            )}
            {item.toc?.some((h) => h.source === "ai") && (
              <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
                <Sparkles className="mr-1 inline h-2.5 w-2.5 text-[var(--ai)]" />
                Items marked are AI-suggested.
              </p>
            )}
          </div>
        </aside>

        {/* Content */}
        <article className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="grid h-5 w-5 place-items-center rounded border border-border bg-background font-display text-[10px]">
                {item.faviconLetter}
              </span>
              <span>{item.domain}</span>
              {item.author && (
                <>
                  <span>·</span>
                  <span>{item.author}</span>
                </>
              )}
              {item.publishedDate && (
                <>
                  <span>·</span>
                  <span>{item.publishedDate}</span>
                </>
              )}
              <span>·</span>
              <StatusBadge status={item.status} />
            </div>
            <h1 className="break-words font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
              {item.extractedTitle || item.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {item.bookshelf && (
                <Link
                  to="/bookshelves/$slug"
                  params={{ slug: item.bookshelf }}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-accent"
                >
                  {bookshelfLabel(item.bookshelf)}
                </Link>
              )}
              {item.tags.map((t) => (
                <TagChip key={t} tag={t} />
              ))}
            </div>
          </header>

          {item.status === "partial" && item.partialReason && (
            <div className="mt-6 rounded-lg border border-[color-mix(in_oklab,var(--status-partial)_30%,var(--border))] bg-[color-mix(in_oklab,var(--status-partial)_8%,transparent)] p-4 text-sm">
              <div className="font-medium text-foreground">{t("states.partial")}</div>
              <p className="mt-1 text-muted-foreground">{item.partialReason}</p>
              {/* Google Docs/Sheets/Slides are permanently login-gated — every
                  retry hits the same 401, so "Try again" would just disappoint
                  the user a second time. Only offer it when reprocessing could
                  plausibly succeed. */}
              {item.sourceType !== "google_doc" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => reprocess(item.id)}
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t("states.tryAgain")}
                </Button>
              )}
            </div>
          )}

          {/* AI Abstract — visually separated */}
          {aiAvailable ? (
            <section
              className="mt-6 rounded-xl border border-[color-mix(in_oklab,var(--ai)_30%,var(--border))] bg-[var(--ai-surface)] p-5"
              aria-label="AI Abstract"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--ai)]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ai)]">
                  AI Abstract
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-foreground">{item.aiAbstract}</p>
            </section>
          ) : !item.aiAbstract && user.plan === "free" ? (
            <div className="mt-6">
              <PremiumLockState
                feature="AI Abstract"
                description="Premium summarizes every saved article so you can scan your library at a glance."
              />
            </div>
          ) : null}

          {item.readableContent ? (
            <div className="font-reading mt-8 space-y-5 text-[17px] leading-[1.75] text-foreground/90">
              {contentParagraphs.map((p, i) => {
                const heading = item.toc?.[i];
                return (
                  <div key={p.id}>
                    {heading && (
                      <h2
                        id={heading.id}
                        className="font-display mb-2 mt-8 scroll-mt-20 text-xl font-medium text-foreground"
                      >
                        {heading.text}
                      </h2>
                    )}
                    <p>{p.text}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Readable content isn't available for this item yet.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open original source
                </a>
              </Button>
            </div>
          )}
        </article>

        {/* Right column: Personal Note */}
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-sm font-medium text-foreground">Personal Note</h3>
              <div className="text-xs" role="status" aria-live="polite">
                {save === "saving" && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving
                  </span>
                )}
                {save === "saved" && (
                  <span className="inline-flex items-center gap-1 text-[var(--status-ready)]">
                    <Check className="h-3 w-3" aria-hidden="true" /> Saved
                  </span>
                )}
              </div>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNoteLocal(e.target.value)}
              placeholder="Why did you save this? What did it change?"
              rows={8}
              className="resize-none font-reading text-sm"
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Only you can see your notes. Saved automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
