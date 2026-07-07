import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AuthShell } from "./login";
import { useStore } from "@/lib/store";
import { adapter } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { noIndexSeo } from "@/lib/seo";

const VerifyEmailSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: noIndexSeo(
      "Verify your email - Librora",
      "/verify-email",
      "Confirm your Librora account email address.",
    ),
  }),
  validateSearch: VerifyEmailSchema,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const t = useT();
  const navigate = useNavigate();
  const signIn = useStore((s) => s.signIn);
  const [status, setStatus] = useState<"verifying" | "invalid">(token ? "verifying" : "invalid");

  useEffect(() => {
    if (!token) return;
    adapter.auth
      .verifyEmail(token)
      .then(({ user }) => {
        signIn(user.email, user.displayName);
        navigate({ to: "/inbox" });
      })
      .catch(() => setStatus("invalid"));
    // Runs once per mount — token comes from the URL and doesn't change
    // within this page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "invalid") {
    return (
      <AuthShell
        title={t("auth.verifyEmailInvalidTitle")}
        subtitle={t("auth.verifyEmailInvalidSubtitle")}
      >
        <Button asChild className="w-full">
          <Link to="/login">{t("auth.backToSignIn")}</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.verifyEmailTitle")} subtitle={t("auth.verifyEmailSubtitle")}>
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </AuthShell>
  );
}
