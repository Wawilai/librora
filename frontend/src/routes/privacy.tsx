import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useI18n, DICTS } from "@/lib/i18n";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: seo({
      title: "Privacy Policy - Librora",
      description: "What Librora and the Library Clipper browser extension collect and why.",
      path: "/privacy",
    }),
    links: canonical("/privacy"),
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "2026-07-10";
const CONTACT_EMAIL = "support@librora.xyz";

function PrivacyPage() {
  const t = useT();
  const { lang } = useI18n();
  const permissions = DICTS[lang].privacyPage.permissionsList;

  return (
    <div className="min-h-dvh bg-background py-10">
      <div className="mx-auto max-w-2xl px-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" /> <span className="font-display">Librora</span>
        </Link>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {t("privacyPage.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("privacyPage.updated", { date: LAST_UPDATED })}
          </p>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">{t("privacyPage.intro")}</p>

          <Section title={t("privacyPage.accountTitle")} body={t("privacyPage.accountBody")} />
          <Section title={t("privacyPage.libraryTitle")} body={t("privacyPage.libraryBody")} />
          <Section title={t("privacyPage.extensionTitle")} body={t("privacyPage.extensionBody")} />

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">
              {t("privacyPage.permissionsTitle")}
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-6 text-muted-foreground">
              {permissions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <Section
            title={t("privacyPage.thirdPartyTitle")}
            body={t("privacyPage.thirdPartyBody")}
          />
          <Section title={t("privacyPage.retentionTitle")} body={t("privacyPage.retentionBody")} />
          <Section
            title={t("privacyPage.contactTitle")}
            body={t("privacyPage.contactBody", { email: CONTACT_EMAIL })}
          />

          <div className="mt-6">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("privacyPage.backHome")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
