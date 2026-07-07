import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adapter, ApiError } from "@/lib/api";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { AuthShell, Banner } from "./login";
import { TurnstileWidget, isTurnstileConfigured } from "@/components/librora/turnstile-widget";
import { useT } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-error";
import { noIndexSeo } from "@/lib/seo";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: noIndexSeo(
      "Create your library - Librora",
      "/register",
      "Start a private AI library in seconds.",
    ),
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const confirmErr =
    touched && confirmPassword && password !== confirmPassword
      ? t("auth.passwordsDoNotMatch")
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setAuthError(null);
    if (password !== confirmPassword) return;

    setSubmitting(true);
    try {
      const result = await adapter.auth.register({
        displayName: name || "Reader",
        email: email || "you@app.librora.xyz",
        password,
        confirmPassword,
        turnstileToken: turnstileToken ?? "",
      });
      setPendingEmail(result.email);
    } catch (err) {
      if (err instanceof ApiError) {
        setAuthError(t(authErrorKey(err.code)));
        setSubmitting(false);
        return;
      }
      throw err;
    }
  };

  if (pendingEmail) {
    return (
      <AuthShell
        title={t("auth.verifyEmailPendingTitle")}
        subtitle={t("auth.verifyEmailPendingSubtitle", { email: pendingEmail })}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("auth.verifyEmailPendingHint")}</span>
          </div>
          <Button asChild className="w-full" variant="outline">
            <Link to="/login">{t("auth.backToSignIn")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.registerTitle")} subtitle={t("auth.registerSubtitle")}>
      <form onSubmit={submit} className="space-y-4">
        {authError && (
          <Banner tone="error" icon={<AlertCircle className="h-4 w-4" />}>
            {authError}
          </Banner>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">{t("auth.displayName")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.yourName")}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.atLeast8")}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className={confirmErr ? "text-destructive" : undefined}>
            {t("auth.confirmPassword")}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={t("auth.reenterPassword")}
            disabled={submitting}
            aria-invalid={!!confirmErr}
            aria-describedby={confirmErr ? "confirmPassword-err" : undefined}
          />
          {confirmErr && (
            <p id="confirmPassword-err" className="text-xs font-medium text-destructive">
              {confirmErr}
            </p>
          )}
        </div>
        <TurnstileWidget onVerify={setTurnstileToken} />
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || (isTurnstileConfigured && !turnstileToken)}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.creatingLibrary")}
            </>
          ) : (
            t("auth.createMyLibrary")
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("auth.alreadyHere")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
