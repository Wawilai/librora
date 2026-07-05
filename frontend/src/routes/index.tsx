import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LanguageSwitcher } from "@/components/librora/language-switcher";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useI18n, useT, DICTS } from "@/lib/i18n";
import {
  BookOpen,
  Search,
  Sparkles,
  Inbox,
  LayoutGrid,
  Bookmark,
  ArrowRight,
  Chrome,
  Folder,
  Brain,
  CheckCircle2,
  Plus,
  ListTree,
  StickyNote,
  Library,
  Lock,
  Wand2,
  Download,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Librora — ห้องสมุด AI ส่วนตัวของคุณ" },
      {
        name: "description",
        content:
          "บันทึกบทความ จัดระเบียบอัตโนมัติ และค้นคืนจากสิ่งที่คุณจำได้ — Librora คือห้องสมุดส่วนตัวสำหรับทุกสิ่งที่คุณอยากจำ",
      },
      { property: "og:title", content: "Librora — ห้องสมุด AI ส่วนตัวของคุณ" },
      {
        property: "og:description",
        content: "Collect once. Recall anytime. ห้องสมุดส่วนตัวที่เงียบ สงบ ค้นคืนได้ทุกเวลา",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const signedIn = useStore((s) => s.signedIn);
  const navigate = useNavigate();

  // Zustand's persist middleware rehydrates asynchronously, so this can
  // re-fire once signedIn flips from false -> true just after first mount.
  useEffect(() => {
    if (signedIn) navigate({ to: "/inbox" });
  }, [signedIn, navigate]);

  if (signedIn) return null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PublicHeader />
      <Hero />
      <Problem />
      <HowItWorks />
      <SmartBookshelvesSection />
      <AiLibrarianSection />
      <ReadingRoomSection />
      <ClipperSection />
      <PowerToolsSection />
      <PlansOverview />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─────────── Header ─────────── */
function PublicHeader() {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="w-page flex h-16 items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Librora</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href="#how-it-works"
            className="rounded-md px-3 py-1.5 type-body-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("landing.header.howItWorks")}
          </a>
          <a
            href="#features"
            className="rounded-md px-3 py-1.5 type-body-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("landing.header.features")}
          </a>
          <a
            href="#plans"
            className="rounded-md px-3 py-1.5 type-body-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("landing.header.plans")}
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher compact />
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">{t("landing.header.login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">{t("landing.header.startLibrary")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─────────── Hero ─────────── */
function Hero() {
  const t = useT();
  const titleLines = t("landing.hero.title").split("\n");
  return (
    <section className="w-page px-5 pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Copy column */}
        <div>
          <p className="type-label">{t("landing.hero.label")}</p>
          <h1 className="type-display mt-4 text-foreground">
            {titleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-xl type-body text-muted-foreground sm:text-base">
            {t("landing.hero.description")}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-6">
              <Link to="/register">
                {t("landing.header.startLibrary")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-6">
              <a href="#how-it-works">{t("landing.hero.ctaHow")}</a>
            </Button>
          </div>
          <p className="mt-4 type-caption">{t("landing.hero.caption")}</p>
        </div>

        {/* Visual column — composed preview */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)] blur-2xl"
          />
          <HeroComposition />
        </div>
      </div>
    </section>
  );
}

function HeroComposition() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {/* Background: library item card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <BrowserChrome label="librora.app / library" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ItemCardMock
            domain="paulgraham.com"
            title="Do Things that Don't Scale"
            shelf="Business"
            status="ready"
          />
          <ItemCardMock
            domain="martinfowler.com"
            title="Microservices Resource Guide"
            shelf="Architecture"
            status="ready"
          />
          <ItemCardMock
            domain="andymatuschak.org"
            title="Why books don't work"
            shelf="Learning"
            status="processing"
          />
          <ItemCardMock
            domain="research.google"
            title="Attention Is All You Need"
            shelf="AI"
            status="ready"
            premium
          />
        </div>
      </div>

      {/* Floating extension popup */}
      <div className="absolute -right-4 -top-8 hidden w-[220px] rotate-2 sm:block">
        <ExtensionPopupMock />
      </div>
      {/* Floating semantic-search chip */}
      <div className="absolute -bottom-6 -left-4 hidden w-[260px] -rotate-1 sm:block">
        <SemanticSearchChip />
      </div>
    </div>
  );
}

/* ─────────── Problem ─────────── */
function Problem() {
  const t = useT();
  const { lang } = useI18n();
  const stats = DICTS[lang].landing.problem.stats;
  return (
    <section className="border-t border-border bg-card/40">
      <div className="w-page px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="type-label">{t("landing.problem.label")}</p>
          <h2 className="type-page-title mt-3 text-foreground sm:text-[2.25rem]">
            {t("landing.problem.title")}
          </h2>
          <p className="mt-4 type-body text-muted-foreground">{t("landing.problem.description")}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {stats.map((c) => (
            <div
              key={c.value}
              className="rounded-xl border border-border bg-background p-5 text-center"
            >
              <p className="font-display text-2xl font-medium text-foreground">{c.value}</p>
              <p className="mt-1 type-body-sm text-muted-foreground">{c.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── How It Works ─────────── */
function HowItWorks() {
  const t = useT();
  const { lang } = useI18n();
  const stepsCopy = DICTS[lang].landing.howItWorks.steps;
  const stepIcons = [Inbox, Sparkles, Search, BookOpen, Bookmark];
  const steps = stepsCopy.map((s, i) => ({ icon: stepIcons[i], label: s.label, text: s.text }));
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border">
      <div className="w-page px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="type-label">{t("landing.howItWorks.label")}</p>
          <h2 className="type-page-title mt-3 text-foreground sm:text-[2.25rem]">
            {t("landing.howItWorks.title")}
          </h2>
          <p className="mt-3 type-body text-muted-foreground">
            {t("landing.howItWorks.description")}
          </p>
        </div>

        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.label} className="relative rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="font-display text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-3 type-card-title text-foreground">{s.label}</h3>
              <p className="mt-1 type-body-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────── Smart Bookshelves ─────────── */
function SmartBookshelvesSection() {
  const t = useT();
  const { lang } = useI18n();
  const bullets = DICTS[lang].landing.bookshelves.bullets;
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-card/40">
      <div className="w-page px-5 py-20">
        <FeatureRow
          eyebrow={t("landing.bookshelves.eyebrow")}
          title={t("landing.bookshelves.title")}
          desc={t("landing.bookshelves.description")}
          bullets={bullets}
          visual={<BookshelfMock />}
        />
      </div>
    </section>
  );
}

/* ─────────── AI Librarian & Semantic Search ─────────── */
function AiLibrarianSection() {
  const t = useT();
  const { lang } = useI18n();
  const bullets = DICTS[lang].landing.aiLibrarian.bullets;
  return (
    <section className="border-t border-border">
      <div className="w-page px-5 py-20">
        <FeatureRow
          reverse
          eyebrow={t("landing.aiLibrarian.eyebrow")}
          title={t("landing.aiLibrarian.title")}
          desc={t("landing.aiLibrarian.description")}
          bullets={bullets}
          visual={<SemanticResultMock />}
        />
      </div>
    </section>
  );
}

/* ─────────── Reading Room ─────────── */
function ReadingRoomSection() {
  const t = useT();
  const { lang } = useI18n();
  const bullets = DICTS[lang].landing.readingRoom.bullets;
  return (
    <section className="border-t border-border bg-card/40">
      <div className="w-page px-5 py-20">
        <FeatureRow
          eyebrow={t("landing.readingRoom.eyebrow")}
          title={t("landing.readingRoom.title")}
          desc={t("landing.readingRoom.description")}
          bullets={bullets}
          visual={<ReadingRoomMock />}
        />
      </div>
    </section>
  );
}

/* ─────────── Library Clipper ─────────── */
function ClipperSection() {
  const t = useT();
  const { lang } = useI18n();
  const bullets = DICTS[lang].landing.clipper.bullets;
  return (
    <section className="border-t border-border">
      <div className="w-page px-5 py-20">
        <FeatureRow
          reverse
          eyebrow={t("landing.clipper.eyebrow")}
          title={t("landing.clipper.title")}
          desc={t("landing.clipper.description")}
          bullets={bullets}
          visual={<ExtensionPopupMock large />}
        />
      </div>
    </section>
  );
}

/* ─────────── Power Tools (bookshelf rules, export, digest) ─────────── */
function PowerToolsSection() {
  const t = useT();
  const { lang } = useI18n();
  const toolIcons: Record<string, { icon: typeof Wand2; color: string }> = {
    bookshelfRules: { icon: Wand2, color: "var(--ai)" },
    export: { icon: Download, color: "var(--primary)" },
    digest: { icon: Mail, color: "var(--status-ready)" },
  };
  const tools = DICTS[lang].landing.powerTools.tools.map((tool) => ({
    ...tool,
    ...toolIcons[tool.key],
  }));
  return (
    <section className="border-t border-border bg-card/40">
      <div className="w-page px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="type-label">{t("landing.powerTools.label")}</p>
          <h2 className="type-page-title mt-3 text-foreground sm:text-[2.25rem]">
            {t("landing.powerTools.title")}
          </h2>
          <p className="mt-3 type-body text-muted-foreground">
            {t("landing.powerTools.description")}
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-3">
          {tools.map((tool) => (
            <div
              key={tool.key}
              className="rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-elevated)]"
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: `color-mix(in oklab, ${tool.color} 14%, transparent)` }}
              >
                <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
              </span>
              <div className="mt-4 flex items-center gap-2">
                <p className="type-card-title text-foreground">{tool.title}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_18%,transparent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--premium)_60%,var(--foreground))]">
                  <Sparkles className="h-3 w-3" /> Premium
                </span>
              </div>
              <p className="mt-2 type-body-sm text-muted-foreground">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Plans Overview ─────────── */
function PlansOverview() {
  const { lang } = useI18n();
  const copy = DICTS[lang].landing.plans;

  return (
    <section id="plans" className="scroll-mt-20 border-t border-border bg-card/40">
      <div className="w-page px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="type-label">{copy.eyebrow}</p>
          <h2 className="type-page-title mt-3 text-foreground sm:text-[2.25rem]">{copy.title}</h2>
          <p className="mt-3 type-body text-muted-foreground">{copy.description}</p>
          <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 type-body-sm text-muted-foreground">
            <span className="font-medium text-foreground">{copy.dailyAnchor}</span>
            <span aria-hidden>·</span>
            <span>{copy.yearlyAnchor}</span>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
          <PlanCard
            title={copy.free.title}
            tagline={copy.free.tagline}
            price={copy.free.price}
            priceNote={copy.free.priceNote}
            features={copy.free.features}
            cta={copy.free.cta}
          />
          <PlanCard
            title={copy.premium.title}
            tagline={copy.premium.tagline}
            price={copy.premium.price}
            priceNote={copy.premium.priceNote}
            yearlyPrice={copy.premium.yearlyPrice}
            yearlyNote={copy.premium.yearlyNote}
            savings={copy.premium.savings}
            highlight
            features={copy.premium.features}
            cta={copy.premium.cta}
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  title,
  tagline,
  price,
  priceNote,
  yearlyPrice,
  yearlyNote,
  savings,
  features,
  cta,
  highlight,
}: {
  title: string;
  tagline: string;
  price: string;
  priceNote: string;
  yearlyPrice?: string;
  yearlyNote?: string;
  savings?: string;
  features: readonly string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-7 " +
        (highlight
          ? "border-[color-mix(in_oklab,var(--premium)_40%,var(--border))] bg-[color-mix(in_oklab,var(--premium)_6%,var(--card))]"
          : "border-border bg-background")
      }
    >
      <div className="flex items-center gap-2">
        <h3 className="font-display text-2xl font-medium">{title}</h3>
        {highlight && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--premium)_60%,var(--foreground))]">
            <Sparkles className="h-3 w-3" /> Premium
          </span>
        )}
      </div>
      <p className="mt-1 type-body-sm text-muted-foreground">{tagline}</p>
      <div className="mt-5">
        <p className="font-display text-4xl font-medium tracking-tight text-foreground">{price}</p>
        <p className="mt-1 type-body-sm text-muted-foreground">{priceNote}</p>
        {yearlyPrice && (
          <div className="mt-4 rounded-lg border border-border bg-background/70 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-xl font-medium text-foreground">{yearlyPrice}</p>
              {savings && (
                <span className="rounded-full bg-[color-mix(in_oklab,var(--status-ready)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--status-ready)]">
                  {savings}
                </span>
              )}
            </div>
            {yearlyNote && <p className="mt-1 type-body-sm text-muted-foreground">{yearlyNote}</p>}
          </div>
        )}
      </div>
      <ul className="mt-5 space-y-2.5 type-body-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-foreground/85">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-ready)]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/register">{cta}</Link>
      </Button>
    </div>
  );
}

/* ─────────── Final CTA ─────────── */
function FinalCta() {
  const t = useT();
  const titleLines = t("landing.finalCta.title").split("\n");
  return (
    <section className="border-t border-border">
      <div className="w-page px-5 py-24 text-center">
        <p className="type-label">{t("landing.finalCta.label")}</p>
        <h2 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
          {titleLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br className="hidden sm:block" />}
              {i > 0 ? " " : ""}
              {line}
            </span>
          ))}
        </h2>
        <p className="mx-auto mt-4 max-w-md type-body text-muted-foreground">
          {t("landing.finalCta.description")}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-11 px-6">
            <Link to="/register">
              {t("landing.finalCta.ctaStart")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6">
            <Link to="/login">{t("landing.finalCta.ctaLogin")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Footer ─────────── */
function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-border">
      <div className="w-page flex flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">Librora</p>
            <p className="type-caption">{t("landing.footer.tagline")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 type-body-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground">
            {t("landing.footer.howItWorks")}
          </a>
          <a href="#features" className="hover:text-foreground">
            {t("landing.footer.features")}
          </a>
          <a href="#plans" className="hover:text-foreground">
            {t("landing.footer.plans")}
          </a>
          <Link to="/extension" className="inline-flex items-center gap-1 hover:text-foreground">
            <Chrome className="h-3.5 w-3.5" /> {t("landing.footer.clipper")}
          </Link>
          <Link to="/login" className="hover:text-foreground">
            {t("landing.footer.login")}
          </Link>
        </div>
        <p className="type-caption sm:text-right">
          {t("landing.footer.copyright", { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════
   Reusable feature row + UI previews
   ════════════════════════════════════════════ */

function FeatureRow({
  eyebrow,
  title,
  desc,
  bullets,
  visual,
  reverse,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={
        "grid items-center gap-10 lg:grid-cols-2 lg:gap-14 " +
        (reverse ? "lg:[&>*:first-child]:order-2" : "")
      }
    >
      <div>
        <p className="type-label">{eyebrow}</p>
        <h3 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          {title}
        </h3>
        <p className="mt-4 type-body text-muted-foreground">{desc}</p>
        <ul className="mt-5 space-y-2.5 type-body-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-foreground/85">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-ready)]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0">{visual}</div>
    </div>
  );
}

function BrowserChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border pb-3">
      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
      <span className="ml-3 type-caption">{label}</span>
    </div>
  );
}

function ItemCardMock({
  domain,
  title,
  shelf,
  status,
  premium,
}: {
  domain: string;
  title: string;
  shelf: string;
  status: "ready" | "processing";
  premium?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="type-caption truncate">{domain}</span>
        {status === "ready" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--status-ready)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--status-ready)]">
            <CheckCircle2 className="h-2.5 w-2.5" /> Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--status-processing)_12%,transparent)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--status-processing)]">
            <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--status-processing)]" />
            Processing
          </span>
        )}
      </div>
      <p className="mt-2 type-card-title leading-snug text-foreground">{title}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 type-caption">
          <Folder className="h-3 w-3" />
          {shelf}
        </span>
        {premium && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--premium)_60%,var(--foreground))]">
            <Sparkles className="h-2.5 w-2.5" />
            AI
          </span>
        )}
      </div>
    </div>
  );
}

function BookshelfMock() {
  const shelves = [
    { name: "AI & ML", count: 32, c: "var(--ai)" },
    { name: "Design Systems", count: 24, c: "var(--primary)" },
    { name: "Business", count: 18, c: "var(--status-partial)" },
    { name: "Philosophy", count: 9, c: "var(--status-ready)" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
      <BrowserChrome label="librora.app / bookshelves" />
      <div className="mt-4 flex items-center justify-between">
        <p className="type-section-title">Smart Bookshelves</p>
        <span className="type-caption">Auto-organized</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {shelves.map((s) => (
          <div key={s.name} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-md text-foreground"
                style={{ background: `color-mix(in oklab, ${s.c} 14%, transparent)` }}
              >
                <Library className="h-4 w-4" style={{ color: s.c }} />
              </span>
              <div className="min-w-0">
                <p className="truncate type-card-title">{s.name}</p>
                <p className="type-caption">{s.count} items</p>
              </div>
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background:
                      i < 4 ? `color-mix(in oklab, ${s.c} 50%, transparent)` : "var(--color-muted)",
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemanticResultMock() {
  const t = useT();
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
      <BrowserChrome label="librora.app / search" />
      <div className="mt-4 rounded-md border border-border bg-background px-3 py-2">
        <div className="flex items-center gap-2 type-body-sm text-foreground">
          <Brain className="h-4 w-4 text-[var(--ai)]" />
          <span className="italic text-muted-foreground">"{t("landing.semanticMock.query")}"</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <SearchResult
          domain="basecamp.com"
          title="The calm company handbook"
          excerpt="…trust is built through small, consistent acts of care, not grand offsites or quarterly reviews…"
          score={0.92}
        />
        <SearchResult
          domain="stripe.press"
          title="Working in public, quietly"
          excerpt="…remote teams form rituals around writing — a shared document is the campfire of the distributed team…"
          score={0.81}
        />
      </div>
    </div>
  );
}

function SearchResult({
  domain,
  title,
  excerpt,
  score,
}: {
  domain: string;
  title: string;
  excerpt: string;
  score: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="type-caption">{domain}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--ai)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ai)]">
          <Sparkles className="h-2.5 w-2.5" /> {Math.round(score * 100)}% match
        </span>
      </div>
      <p className="mt-1 type-card-title text-foreground">{title}</p>
      <p className="mt-1 type-body-sm text-muted-foreground">{excerpt}</p>
    </div>
  );
}

function SemanticSearchChip() {
  const t = useT();
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-elevated)]">
      <div className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-[var(--ai)]" />
        <span className="type-caption">Semantic search</span>
      </div>
      <p className="mt-1 type-body-sm italic text-muted-foreground">
        "{t("landing.semanticMock.chipQuery")}"
      </p>
      <p className="mt-2 type-caption text-[var(--ai)]">3 matches in your library</p>
    </div>
  );
}

function ReadingRoomMock() {
  const { lang } = useI18n();
  const mock = DICTS[lang].landing.readingRoom.mock;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
      <BrowserChrome label="librora.app / reading room" />
      <div className="mt-4 grid grid-cols-[140px_1fr_140px] gap-3">
        {/* TOC */}
        <div className="hidden rounded-md border border-border bg-background p-3 sm:block">
          <div className="flex items-center gap-1.5 type-caption">
            <ListTree className="h-3 w-3" /> {mock.contentsLabel}
          </div>
          <ul className="mt-2 space-y-1 type-caption">
            {mock.sections.map((s, i) => (
              <li key={s} className={i === 0 ? "text-foreground" : undefined}>
                {s}
              </li>
            ))}
          </ul>
        </div>
        {/* Reading body */}
        <article className="rounded-md bg-background p-4">
          <h4 className="font-display text-base font-medium text-foreground">
            On the discipline of attention
          </h4>
          <p className="mt-2 font-reading text-[13px] leading-[1.7] text-foreground/85">
            We read with the wrong muscles. The page asks for patience, but the browser keeps asking
            for elsewhere. The library exists so that one of these wins.
          </p>
          <p className="mt-2 font-reading text-[13px] leading-[1.7] text-foreground/70">
            {mock.description}
          </p>
        </article>
        {/* Note */}
        <div className="hidden rounded-md border border-border bg-[var(--ai-surface)]/40 p-3 sm:block">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ai)]">
            <StickyNote className="h-3 w-3" /> Note
          </div>
          <p className="mt-2 type-caption text-foreground/85">{mock.noteExample}</p>
        </div>
      </div>
    </div>
  );
}

function ExtensionPopupMock({ large }: { large?: boolean }) {
  const { lang } = useI18n();
  const mock = DICTS[lang].landing.clipper.mock;
  return (
    <div
      className={
        "rounded-xl border border-border bg-card shadow-[var(--shadow-elevated)] " +
        (large ? "mx-auto w-full max-w-[340px]" : "")
      }
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Chrome className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="type-caption">Library Clipper</span>
        </div>
        <Lock className="h-3 w-3 text-muted-foreground" aria-label="Private" />
      </div>
      <div className="p-3">
        <p className="type-caption">Current tab</p>
        <p className="mt-1 type-card-title leading-snug">The Future of Personal Knowledge Bases</p>
        <p className="mt-0.5 type-caption">stratechery.com</p>

        <div className="mt-3 rounded-md border border-border bg-background p-2">
          <p className="type-caption">{mock.noteLabel}</p>
          <p className="mt-1 type-body-sm text-foreground/70">{mock.noteExample}</p>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground">
            <Plus className="h-3 w-3" /> Save
          </button>
          <button className="inline-flex items-center justify-center rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground/80">
            <LayoutGrid className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
