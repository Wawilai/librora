import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader } from "@/components/librora/page-header";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Gauge, Info, Lock, RefreshCcw, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adapter, ApiError, type PlanUsage } from "@/lib/api";
import { ErrorState, LoadingSkeleton } from "@/components/librora/shared-states";
import { SegmentedControl } from "@/components/librora/segmented-control";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

const PlanSearchSchema = z.object({
  checkout: z.enum(["success", "cancelled"]).optional(),
});

export const Route = createFileRoute("/_app/plan")({
  head: () => ({ meta: [{ title: "Plan & Usage - Librora" }] }),
  validateSearch: PlanSearchSchema,
  component: PlanPage,
});

function PlanPage() {
  const setPlan = useStore((s) => s.setPlan);
  const navigate = useNavigate({ from: "/plan" });
  const { checkout } = useSearch({ from: "/_app/plan" });
  const { lang, t } = useI18n();
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const load = () => {
    setLoading(true);
    setError(false);
    adapter.subscriptions
      .planUsage()
      .then((data) => {
        setUsage(data);
        setPlan(data.subscription.planCode === "PREMIUM" ? "premium" : "free");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!checkout) return;
    if (checkout === "success") {
      // The Stripe webhook may lag a moment behind the redirect — refetch to pick up
      // the new plan rather than assuming it has already synced.
      toast(t("planPage.paymentReceived"));
      load();
    } else if (checkout === "cancelled") {
      toast(t("planPage.checkoutCancelled"));
    }
    void navigate({ search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout]);

  const handleUpgrade = async () => {
    setCheckoutBusy(true);
    try {
      const { url } = await adapter.billing.createCheckoutSession(billingInterval);
      window.location.href = url;
    } catch (err) {
      // Surface the backend's actual reason (e.g. Stripe not configured) rather
      // than always showing the same generic message regardless of cause.
      toast.error(err instanceof ApiError ? err.message : t("planPage.checkoutError"));
      setCheckoutBusy(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalBusy(true);
    try {
      const { url } = await adapter.billing.createPortalSession();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("planPage.portalError"));
      setPortalBusy(false);
    }
  };

  const { periodLabel, resetLabel } = useMemo(() => {
    const now = new Date();
    const dateLocale = lang === "th" ? "th-TH" : "en-US";
    // cycleResetsAt is anchored to the subscription's real start date (see
    // backend's billing-period.util.ts), not the 1st of the calendar month —
    // falls back to next calendar month only while usage hasn't loaded yet.
    const reset = usage?.subscription.cycleResetsAt
      ? new Date(usage.subscription.cycleResetsAt)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      periodLabel: now.toLocaleDateString(dateLocale, { month: "long", year: "numeric" }),
      resetLabel: reset.toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  }, [lang, usage?.subscription.cycleResetsAt]);

  const isPremium = usage?.subscription.planCode === "PREMIUM";
  const metric = (name: PlanUsage["usage"][number]["metric"]) =>
    usage?.usage.find((u) => u.metric === name) ?? { used: 0, limit: 0, remaining: 0 };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("planPage.title")}
        description={t("planPage.description")}
        icon={<Gauge className="h-5 w-5" />}
      />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : error || !usage ? (
        <ErrorState
          title={t("planPage.loadErrorTitle")}
          description={t("planPage.loadErrorDesc")}
          action={
            <Button variant="outline" className="gap-1.5" onClick={load}>
              <RefreshCcw className="h-4 w-4" /> {t("planPage.retry")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-medium text-foreground">
                  {usage.subscription.planName}
                </span>
                {isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_20%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--premium-foreground)]">
                    <Sparkles className="h-3 w-3" /> {t("planPage.active")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("planPage.cycleLine", { period: periodLabel, reset: resetLabel })}
              </p>
            </div>
            {isPremium ? (
              <Button variant="outline" onClick={handleManageBilling} disabled={portalBusy}>
                {portalBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {t("planPage.manageBilling")}
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <SegmentedControl
                  size="sm"
                  value={billingInterval}
                  onChange={setBillingInterval}
                  ariaLabel={t("planPage.billingInterval")}
                  options={[
                    { value: "monthly", label: t("planPage.monthly") },
                    { value: "yearly", label: t("planPage.yearly") },
                  ]}
                />
                <Button onClick={handleUpgrade} disabled={checkoutBusy}>
                  {checkoutBusy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  {t("planPage.upgrade")}
                </Button>
              </div>
            )}
          </div>

          <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t("planPage.usageHeading")}
          </h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UsageDetailCard
              label={t("planPage.aiProcessing")}
              sublabel={t("planPage.aiProcessingSub")}
              used={metric("AI_PROCESSING").used}
              limit={metric("AI_PROCESSING").limit}
              resetLabel={resetLabel}
              locked={!usage.features.aiAbstract}
            />
            <UsageDetailCard
              label={t("planPage.semanticSearch")}
              sublabel={t("planPage.semanticSearchSub")}
              used={metric("SEMANTIC_SEARCH").used}
              limit={metric("SEMANTIC_SEARCH").limit}
              resetLabel={resetLabel}
              locked={!usage.features.semanticSearch}
            />
            <UsageDetailCard
              label={t("planPage.reprocess")}
              sublabel={t("planPage.reprocessSub")}
              used={metric("REPROCESS").used}
              limit={metric("REPROCESS").limit}
              resetLabel={resetLabel}
              locked={!usage.features.reprocessItem}
            />
          </div>

          <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t("planPage.planComparison")}
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <PlanColumn
              title={t("planPage.free")}
              tagline={t("planPage.freeTagline")}
              current={!isPremium}
              features={[
                t("planPage.featurePersonalLibrary"),
                t("planPage.featureAddUrl"),
                t("planPage.featureMetadata"),
                t("planPage.featureManualTags"),
                t("planPage.featureKeywordSearch"),
                t("planPage.featurePersonalNote"),
                t("planPage.featureReadingList"),
                t("planPage.featureArchive"),
              ]}
            />
            <PlanColumn
              title={t("planPage.premium")}
              tagline={t("planPage.premiumTagline")}
              highlight
              current={isPremium}
              features={[
                t("planPage.featureEverythingFree"),
                t("planPage.featureAiAbstract"),
                t("planPage.featureAutoTags"),
                t("planPage.featureSmartBookshelves"),
                t("planPage.semanticSearch"),
                t("planPage.featureSmartToc"),
                t("planPage.reprocess"),
                t("planPage.featureHigherQuota"),
              ]}
            />
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{t("planPage.info")}</p>
          </div>
        </>
      )}
    </div>
  );
}

function UsageDetailCard({
  label,
  sublabel,
  used,
  limit,
  resetLabel,
  locked,
}: {
  label: string;
  sublabel?: string;
  used: number;
  limit: number;
  resetLabel: string;
  locked?: boolean;
}) {
  const { t } = useI18n();
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, limit - used);
  const tone =
    pct >= 100 ? "bg-destructive" : pct >= 85 ? "bg-[var(--status-partial)]" : "bg-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {sublabel && (
            <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sublabel}</div>
          )}
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
            <Lock className="h-2.5 w-2.5" /> {t("planPage.premium")}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-medium text-foreground">
          {locked ? "-" : used.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">
          / {locked ? "-" : limit.toLocaleString()}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        {!locked && (
          <div
            className={`h-full rounded-full transition-all ${tone}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {locked
            ? t("planPage.lockedPremium")
            : t("planPage.remaining", { n: remaining.toLocaleString() })}
        </span>
        <span>{locked ? "-" : t("planPage.reset", { date: resetLabel })}</span>
      </div>
    </div>
  );
}

function PlanColumn({
  title,
  tagline,
  features,
  highlight,
  current,
}: {
  title: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  current?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-[color-mix(in_oklab,var(--premium)_40%,var(--border))] bg-[color-mix(in_oklab,var(--premium)_5%,var(--card))]"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-display text-2xl font-medium">{title}</h3>
        {highlight && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_20%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--premium-foreground)]">
            <Sparkles className="h-3 w-3" /> {t("planPage.premium")}
          </span>
        )}
        {current && (
          <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {t("planPage.currentPlan")}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-foreground/80">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
