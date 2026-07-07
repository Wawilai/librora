import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Chrome,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Download,
  FolderOpen,
  ToggleRight,
  FolderInput,
  Puzzle,
  Copy,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { pingExtension, handoffToExtension } from "@/lib/extension-bridge";
import { useStore } from "@/lib/store";
import { adapter } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { canonical, seo } from "@/lib/seo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: seo({
      title: "Library Clipper - Librora",
      description: "Install the Librora Chrome clipper to save articles into your AI library.",
      path: "/extension",
    }),
    links: canonical("/extension"),
  }),
  component: ExtensionPage,
});

type Status = "checking" | "not-installed" | "connecting" | "connected" | "error";

function ExtensionPage() {
  const signedIn = useStore((s) => s.signedIn);
  const [status, setStatus] = useState<Status>("checking");
  const t = useT();

  const connect = () => {
    setStatus("checking");
    pingExtension()
      .then((installed) => {
        if (!installed) {
          setStatus("not-installed");
          return;
        }
        if (!signedIn) {
          setStatus("not-installed");
          return;
        }
        setStatus("connecting");
        return adapter.auth
          .extensionHandoff()
          .then((tokens) =>
            handoffToExtension({
              accessToken: tokens.accessToken,
              expiresIn: tokens.accessTokenExpiresIn,
            }),
          )
          .then((ok) => setStatus(ok ? "connected" : "error"));
      })
      .catch(() => setStatus("error"));
  };

  // Re-run when signedIn changes (e.g. Zustand persist rehydrates asynchronously
  // on mount, so signedIn can flip from false -> true just after first render).
  useEffect(connect, [signedIn]);

  return (
    <div className="min-h-dvh bg-background py-10">
      <div className="mx-auto max-w-xl px-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" /> <span className="font-display">Librora</span>
        </Link>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Chrome className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">
                {t("extensionPage.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("extensionPage.subtitle")}</p>
            </div>
          </div>

          <StatusBanner status={status} onRetry={connect} />

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {t("extensionPage.description")}
          </p>

          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">{t("extensionPage.downloadTitle")}</p>
            <Button asChild className="mt-3 w-full sm:w-auto">
              <a href="/librora-clipper.zip" download>
                <Download className="mr-1.5 h-4 w-4" /> {t("extensionPage.downloadButton")}
              </a>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">{t("extensionPage.downloadHint")}</p>

            <div className="mt-4 space-y-3">
              <StepCard
                index={1}
                title={t("extensionPage.step1")}
                caption={t("extensionPage.step1Caption")}
              >
                <UnzipMock />
              </StepCard>
              <StepCard
                index={2}
                title={t("extensionPage.step2")}
                caption={t("extensionPage.step2Caption")}
              >
                <ExtensionsPageMock />
                <CopyChromeUrlButton />
              </StepCard>
              <StepCard
                index={3}
                title={t("extensionPage.step3")}
                caption={t("extensionPage.step3Caption")}
              >
                <LoadUnpackedMock />
              </StepCard>
              <StepCard
                index={4}
                title={t("extensionPage.step4")}
                caption={t("extensionPage.step4Caption")}
              >
                <ToolbarPinMock />
              </StepCard>
            </div>

            <p className="mt-4 text-xs font-medium text-foreground">
              {t("extensionPage.comeBack")}
            </p>

            <Collapsible className="mt-4 border-t border-border pt-3">
              <CollapsibleTrigger className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                {t("extensionPage.manualBuildToggle")}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <p className="font-medium text-foreground">{t("extensionPage.installTitle")}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
                  <li>
                    {t("extensionPage.buildInstruction")}{" "}
                    <code className="text-xs">cd extension &amp;&amp; bun run build</code>
                  </li>
                  <li>{t("extensionPage.openExtensions")}</li>
                  <li>{t("extensionPage.loadUnpacked")}</li>
                  <li>{t("extensionPage.comeBack")}</li>
                </ol>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/library">{t("extensionPage.openLibrary")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("extensionPage.backHome")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ status, onRetry }: { status: Status; onRetry: () => void }) {
  const t = useT();
  const config: Record<Status, { icon: React.ReactNode; text: string; tone: string }> = {
    checking: {
      icon: <CircleDashed className="h-4 w-4 animate-spin" />,
      text: t("extensionPage.checking"),
      tone: "text-muted-foreground",
    },
    connecting: {
      icon: <CircleDashed className="h-4 w-4 animate-spin" />,
      text: t("extensionPage.connecting"),
      tone: "text-muted-foreground",
    },
    connected: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: t("extensionPage.connected"),
      tone: "text-primary",
    },
    "not-installed": {
      icon: <CircleAlert className="h-4 w-4" />,
      text: t("extensionPage.notInstalled"),
      tone: "text-muted-foreground",
    },
    error: {
      icon: <CircleAlert className="h-4 w-4" />,
      text: t("extensionPage.error"),
      tone: "text-destructive",
    },
  };

  const { icon, text, tone } = config[status];

  return (
    <div className={`mt-4 flex items-center gap-2 text-sm ${tone}`}>
      {icon}
      <span>{text}</span>
      {status === "error" && (
        <button onClick={onRetry} className="ml-1 underline underline-offset-2">
          {t("extensionPage.retry")}
        </button>
      )}
    </div>
  );
}

function StepCard({
  index,
  title,
  caption,
  children,
}: {
  index: number;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
          <div className="mt-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CopyChromeUrlButton() {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      .writeText("chrome://extensions")
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => null);
  };

  return (
    <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("extensionPage.copied") : t("extensionPage.copyPath")}
    </Button>
  );
}

// ── Lightweight step illustrations (not real screenshots — small mockups in
// the app's existing visual style, matching BrowserChrome/ItemCardMock on the
// landing page) ───────────────────────────────────────────────────────────

function MockWindowChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border pb-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
      <span className="ml-2 truncate text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function UnzipMock() {
  return (
    <div className="max-w-[220px] rounded-md border border-border bg-muted/30 p-3">
      <MockWindowChrome label="Downloads" />
      <div className="mt-2 flex items-center gap-2 rounded border border-dashed border-border p-2">
        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-[11px] text-muted-foreground">librora-clipper/</span>
      </div>
    </div>
  );
}

function ExtensionsPageMock() {
  return (
    <div className="max-w-[260px] rounded-md border border-border bg-muted/30 p-3">
      <MockWindowChrome label="chrome://extensions" />
      <div className="mt-2 flex items-center justify-between rounded border border-border bg-background px-2 py-1.5">
        <span className="text-[11px] text-muted-foreground">Developer mode</span>
        <ToggleRight className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

function LoadUnpackedMock() {
  return (
    <div className="max-w-[260px] rounded-md border border-border bg-muted/30 p-3">
      <MockWindowChrome label="chrome://extensions" />
      <div className="mt-2 inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1.5 text-[11px] text-foreground">
        <FolderInput className="h-3.5 w-3.5 text-primary" />
        Load unpacked
      </div>
    </div>
  );
}

function ToolbarPinMock() {
  return (
    <div className="max-w-[260px] rounded-md border border-border bg-muted/30 p-3">
      <MockWindowChrome label="app.librora.xyz" />
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <Puzzle className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="grid h-5 w-5 place-items-center rounded bg-primary/10 text-primary">
          <BookOpen className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
