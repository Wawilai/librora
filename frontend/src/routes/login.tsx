import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { adapter, ApiError } from "@/lib/api";
import { BookOpen, Eye, EyeOff, Loader2, WifiOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TurnstileWidget } from "@/components/librora/turnstile-widget";
import { useT } from "@/lib/i18n";
import { authErrorKey } from "@/lib/auth-error";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in - Librora" },
      { name: "description", content: "Sign in to your personal AI library." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const signIn = useStore((s) => s.signIn);
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const emailErr = !email.trim()
    ? t("auth.emailRequired")
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? t("auth.emailInvalid")
      : null;
  const pwErr = !password ? t("auth.passwordRequired") : null;
  const formInvalid = !!(emailErr || pwErr);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setAuthError(null);
    setNetworkError(null);
    if (formInvalid) return;

    setSubmitting(true);
    try {
      const { user } = await adapter.auth.login({
        email: email.trim(),
        password,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      signIn(user.email, user.displayName);
      navigate({ to: "/inbox" });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "AUTH_CAPTCHA_REQUIRED") {
          // Backend detected repeated recent failures from this IP — show
          // the widget and let the user retry with a token. Most users never
          // hit this path.
          setCaptchaRequired(true);
          setAuthError(t(authErrorKey(err.code)));
        } else if (err.httpStatus === 0) {
          setNetworkError(t("auth.networkError"));
        } else {
          setAuthError(t(authErrorKey(err.code)));
        }
        setSubmitting(false);
        return;
      }
      throw err;
    }
  };

  return (
    <AuthShell title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {authError && (
          <Banner tone="error" icon={<AlertCircle className="h-4 w-4" />}>
            {authError}
          </Banner>
        )}
        {networkError && (
          <Banner tone="warning" icon={<WifiOff className="h-4 w-4" />}>
            {networkError}
          </Banner>
        )}

        <Field id="email" label={t("auth.email")} error={touched.email ? emailErr : null}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@example.com"
            disabled={submitting}
            aria-invalid={!!(touched.email && emailErr)}
            aria-describedby={touched.email && emailErr ? "email-err" : undefined}
          />
        </Field>

        <Field id="password" label={t("auth.password")} error={touched.password ? pwErr : null}>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              aria-invalid={!!(touched.password && pwErr)}
              aria-describedby={touched.password && pwErr ? "password-err" : undefined}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder={t("auth.yourPassword")}
              disabled={submitting}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            {t("auth.forgotPassword")}
          </Link>
        </div>

        {captchaRequired && <TurnstileWidget onVerify={setTurnstileToken} />}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || (captchaRequired && !turnstileToken)}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.signingIn")}
            </>
          ) : (
            t("auth.signIn")
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {t("auth.newHere")}{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t("auth.createLibrary")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useT();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={cn(error && "text-destructive")}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

export function Banner({
  tone,
  icon,
  children,
}: {
  tone: "error" | "warning" | "success";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", toneCls)}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = useT();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Librora</span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground">
            {t("auth.brandLine1")}
            <br />
            <span className="text-primary">{t("auth.brandLine2")}</span>
          </h2>
          <p className="mt-4 text-muted-foreground">{t("auth.brandDesc")}</p>
        </div>
        <p className="text-xs text-muted-foreground">© Librora</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Librora</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
