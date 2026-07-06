import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { AuthShell, Banner } from "./login";
import { adapter, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-error";

const ResetPasswordSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password - Librora" },
      { name: "description", content: "Choose a new password for your Librora account." },
    ],
  }),
  validateSearch: ResetPasswordSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const confirmErr =
    touched && confirmPassword && password !== confirmPassword
      ? t("auth.passwordsDoNotMatch")
      : null;
  const pwErr =
    touched && password.length > 0 && password.length < 8 ? t("auth.passwordTooShort") : null;

  if (!token) {
    return (
      <AuthShell title={t("auth.resetInvalidTitle")} subtitle={t("auth.resetInvalidSubtitle")}>
        <Button asChild className="w-full">
          <Link to="/forgot-password">{t("auth.requestNewLink")}</Link>
        </Button>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title={t("auth.passwordUpdatedTitle")}
        subtitle={t("auth.passwordUpdatedSubtitle")}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("auth.passwordUpdatedHint")}</span>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">{t("auth.continueToSignIn")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (password.length < 8 || password !== confirmPassword) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await adapter.auth.resetPassword({ token, password, confirmPassword });
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? t(authErrorKey(err.code)) : t("auth.genericAuthError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {(pwErr || serverError) && (
          <Banner tone="warning">
            <span>{serverError ?? pwErr}</span>
          </Banner>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={t("auth.atLeast8")}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className={confirmErr ? "text-destructive" : undefined}>
            {t("auth.confirmNewPassword")}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={t("auth.reenterNewPassword")}
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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.updating")}
            </>
          ) : (
            <>
              <KeyRound className="mr-1.5 h-4 w-4" /> {t("auth.setNewPassword")}
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
