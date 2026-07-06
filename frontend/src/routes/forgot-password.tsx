import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";
import { AuthShell, Banner, Field } from "./login";
import { Input } from "@/components/ui/input";
import { adapter, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-error";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password - Librora" },
      { name: "description", content: "Get a link to reset your Librora password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailErr = !email.trim()
    ? t("auth.emailRequired")
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? t("auth.emailInvalid")
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailErr) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await adapter.auth.requestPasswordReset({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? t(authErrorKey(err.code)) : t("auth.genericAuthError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title={t("auth.checkEmailTitle")} subtitle={t("auth.checkEmailSubtitle")}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("auth.resetLinkHint")}</span>
          </div>
          <Button asChild className="w-full" variant="outline">
            <Link to="/login">{t("auth.backToSignIn")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && (
          <Banner tone="warning">
            <span>{serverError}</span>
          </Banner>
        )}
        <Field id="email" label={t("auth.email")} error={touched ? emailErr : null}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            disabled={submitting}
            aria-invalid={!!(touched && emailErr)}
            aria-describedby={touched && emailErr ? "email-err" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            t("auth.sending")
          ) : (
            <>
              <Mail className="mr-1.5 h-4 w-4" /> {t("auth.sendResetLink")}
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
