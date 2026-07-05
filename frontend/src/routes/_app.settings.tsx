import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useStore } from "@/lib/store";
import { adapter } from "@/lib/api";
import type { BookshelfRule } from "@/lib/api/types";
import { PageHeader } from "@/components/librora/page-header";
import { PremiumLockState } from "@/components/librora/premium-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  Check,
  Chrome,
  Loader2,
  AlertTriangle,
  LogOut,
  Lock,
  HelpCircle,
  Sparkles,
  Languages,
  Trash2,
  Wand2,
  Play,
  Mail,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/librora/language-switcher";
import { useT } from "@/lib/i18n";
import { ApiError } from "@/lib/api/types";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Librora" }] }),
  component: SettingsPage,
});

type SaveState = "idle" | "editing" | "saving" | "saved" | "validation-error" | "network-error";

function SettingsPage() {
  const user = useStore((s) => s.user);
  const setDisplayName = useStore((s) => s.setDisplayName);
  const signOut = useStore((s) => s.signOut);
  const navigate = useNavigate();
  const t = useT();

  const DisplayNameSchema = z
    .string()
    .trim()
    .min(1, { message: t("settings.nameRequired") })
    .max(60, { message: t("settings.nameTooLong") })
    // eslint-disable-next-line no-control-regex -- intentional: rejects control characters in display names
    .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), {
      message: t("settings.nameInvalidChars"),
    });

  const [name, setName] = useState(user.displayName);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bookshelf rules (Premium)
  const isPremium = user.plan === "premium";
  const [rules, setRules] = useState<BookshelfRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRuleType, setNewRuleType] = useState<BookshelfRule["type"]>("AUTO_ARCHIVE_AFTER_DAYS");
  const [newDays, setNewDays] = useState("30");
  const [newDomain, setNewDomain] = useState("");
  const [newTag, setNewTag] = useState("");
  const [creatingRule, setCreatingRule] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPremium) return;
    setRulesLoading(true);
    adapter.bookshelfRules
      .list()
      .then(setRules)
      .catch(() => null)
      .finally(() => setRulesLoading(false));
  }, [isPremium]);

  // Weekly email digest (Premium)
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestSaving, setDigestSaving] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    adapter.users
      .getDigestPreference()
      .then(({ digestEnabled }) => setDigestEnabled(digestEnabled))
      .catch(() => null);
  }, [isPremium]);

  const onToggleDigest = async (checked: boolean) => {
    setDigestEnabled(checked);
    setDigestSaving(true);
    try {
      await adapter.users.updateDigestPreference(checked);
    } catch (err) {
      setDigestEnabled(!checked);
      toast.error(err instanceof ApiError ? err.message : t("toasts.error"));
    } finally {
      setDigestSaving(false);
    }
  };

  const onCreateRule = async () => {
    setRuleError(null);
    const input =
      newRuleType === "AUTO_ARCHIVE_AFTER_DAYS"
        ? { type: "AUTO_ARCHIVE_AFTER_DAYS" as const, config: { days: Number(newDays) || 0 } }
        : {
            type: "AUTO_TAG_BY_DOMAIN" as const,
            config: { domain: newDomain.trim(), tag: newTag.trim() },
          };
    if (input.type === "AUTO_ARCHIVE_AFTER_DAYS" && input.config.days < 1) {
      setRuleError(t("bookshelfRules.createError"));
      return;
    }
    if (input.type === "AUTO_TAG_BY_DOMAIN" && (!input.config.domain || !input.config.tag)) {
      setRuleError(t("bookshelfRules.createError"));
      return;
    }
    setCreatingRule(true);
    try {
      const created = await adapter.bookshelfRules.create(input);
      setRules((prev) => [created, ...prev]);
      setNewDays("30");
      setNewDomain("");
      setNewTag("");
    } catch (err) {
      setRuleError(err instanceof ApiError ? err.message : t("bookshelfRules.createError"));
    } finally {
      setCreatingRule(false);
    }
  };

  const onToggleRule = async (rule: BookshelfRule) => {
    try {
      const updated = await adapter.bookshelfRules.update(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("toasts.error"));
    }
  };

  const onDeleteRule = async (id: string) => {
    try {
      await adapter.bookshelfRules.remove(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast(t("bookshelfRules.deleted"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("toasts.error"));
    }
  };

  const onApplyRule = async (id: string) => {
    try {
      await adapter.bookshelfRules.applyNow(id);
      toast(t("bookshelfRules.applied"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("toasts.error"));
    }
  };

  const dirty = name !== user.displayName;

  const onChange = (v: string) => {
    setName(v);
    setSave("editing");
    setError(null);
  };

  const onSave = async () => {
    const parsed = DisplayNameSchema.safeParse(name);
    if (!parsed.success) {
      setSave("validation-error");
      setError(parsed.error.issues[0]?.message ?? t("settings.validationError"));
      return;
    }
    setSave("saving");
    setError(null);
    const previousName = user.displayName;
    setDisplayName(parsed.data);
    setName(parsed.data);
    try {
      await adapter.users.updateMe({ displayName: parsed.data });
    } catch {
      setDisplayName(previousName);
      setName(previousName);
      setSave("network-error");
      setError(t("settings.networkError"));
      return;
    }
    setSave("saved");
    toast.success(t("toasts.profileSaved"));
    window.setTimeout(() => setSave("idle"), 1800);
  };

  const handleClearLibrary = () => {
    useStore.setState({ items: [] });
    toast(t("settingsDanger.clearCacheToast"));
    setConfirmClear(false);
  };

  const handleLogout = () => {
    void adapter.auth.logout().catch(() => null);
    signOut();
    toast(t("toasts.signedOut"));
    navigate({ to: "/" });
  };

  const openDeleteDialog = () => {
    setDeletePassword("");
    setDeleteError(null);
    setConfirmDelete(true);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError(t("settingsDanger.enterPassword"));
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await adapter.users.deleteAccount({ password: deletePassword });
    } catch (err) {
      setDeleting(false);
      if (err instanceof ApiError && err.code === "AUTH_INVALID_CREDENTIALS") {
        setDeleteError(t("settingsDanger.incorrectPassword"));
      } else {
        setDeleteError(t("settingsDanger.genericError"));
      }
      return;
    }
    setConfirmDelete(false);
    signOut();
    toast(t("settingsDanger.deletedToast"));
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={t("nav.settings")}
        description={t("settings.description")}
        icon={<SettingsIcon className="h-5 w-5" />}
      />

      {/* Profile */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-medium text-foreground">
          {t("settings.profile")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.profileDesc")}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("settings.displayName")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onChange(e.target.value)}
              maxLength={80}
              aria-invalid={save === "validation-error"}
              aria-describedby={error ? "name-error" : undefined}
              placeholder={t("settings.displayNamePlaceholder")}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("settings.displayNameHint")} · {name.trim().length}/60
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              {t("settings.email")}
              <Lock className="h-3 w-3 text-muted-foreground" />
            </Label>
            <Input id="email" value={user.email} readOnly disabled />
            <p className="text-[11px] text-muted-foreground">{t("settings.emailLocked")}</p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("settings.currentPlan")}</Label>
            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {user.plan === "premium" ? t("header.premium") : t("header.freePlan")}
                </span>
                {user.plan === "premium" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_20%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--premium-foreground)]">
                    <Sparkles className="h-3 w-3" /> {t("planPage.active")}
                  </span>
                )}
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/plan">{t("settings.managePlan")}</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[20px] text-xs" id="name-error" role="status" aria-live="polite">
            {save === "saving" && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("settings.savingShort")}
              </span>
            )}
            {save === "saved" && (
              <span className="inline-flex items-center gap-1 text-[var(--status-ready)]">
                <Check className="h-3 w-3" /> {t("settings.savedShort")}
              </span>
            )}
            {(save === "validation-error" || save === "network-error") && error && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3 w-3" /> {error}
              </span>
            )}
            {save === "editing" && dirty && (
              <span className="text-muted-foreground">{t("settings.unsavedHint")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setName(user.displayName);
                  setSave("idle");
                  setError(null);
                }}
                disabled={save === "saving"}
              >
                {t("common.cancel")}
              </Button>
            )}
            <Button onClick={onSave} disabled={!dirty || save === "saving"}>
              {save === "saving" ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("settings.savingShort")}
                </>
              ) : (
                t("settings.saveChanges")
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium text-foreground">
          <Languages className="h-4 w-4" /> {t("settings.languageTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </section>

      {/* Library Clipper */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-medium text-foreground">
          {t("settings.clipperTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.clipperDesc")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to="/extension">
              <Chrome className="mr-1.5 h-4 w-4" /> {t("settings.installClipper")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/extension">
              <HelpCircle className="mr-1.5 h-4 w-4" /> {t("settings.howToUse")}
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            Chrome · Edge · Brave · Arc (Manifest V3)
          </span>
        </div>
      </section>

      {/* Smart bookshelf rules */}
      {isPremium ? (
        <section className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium text-foreground">
            <Wand2 className="h-4 w-4" /> {t("bookshelfRules.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("bookshelfRules.description")}</p>

          <div className="mt-4 space-y-2">
            {rulesLoading && (
              <p className="text-sm text-muted-foreground">
                <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
              </p>
            )}
            {!rulesLoading && rules.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("bookshelfRules.empty")}</p>
            )}
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {rule.type === "AUTO_ARCHIVE_AFTER_DAYS"
                      ? t("bookshelfRules.archiveRuleLabel", {
                          days: String((rule.config as { days: number }).days),
                        })
                      : t("bookshelfRules.tagRuleLabel", {
                          domain: (rule.config as { domain: string; tag: string }).domain,
                          tag: (rule.config as { domain: string; tag: string }).tag,
                        })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch checked={rule.enabled} onCheckedChange={() => void onToggleRule(rule)} />
                  <Button size="icon" variant="ghost" onClick={() => void onApplyRule(rule.id)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void onDeleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label>{t("bookshelfRules.ruleType")}</Label>
              <Select
                value={newRuleType}
                onValueChange={(v) => setNewRuleType(v as BookshelfRule["type"])}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO_ARCHIVE_AFTER_DAYS">
                    {t("bookshelfRules.autoArchive")}
                  </SelectItem>
                  <SelectItem value="AUTO_TAG_BY_DOMAIN">{t("bookshelfRules.autoTag")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRuleType === "AUTO_ARCHIVE_AFTER_DAYS" ? (
              <div className="space-y-1.5">
                <Label>{t("bookshelfRules.days")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  placeholder={t("bookshelfRules.daysPlaceholder")}
                  className="w-full sm:w-32"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>{t("bookshelfRules.domain")}</Label>
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder={t("bookshelfRules.domainPlaceholder")}
                    className="w-full sm:w-48"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookshelfRules.tag")}</Label>
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder={t("bookshelfRules.tagPlaceholder")}
                    className="w-full sm:w-40"
                  />
                </div>
              </>
            )}

            <Button onClick={() => void onCreateRule()} disabled={creatingRule}>
              {creatingRule ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("bookshelfRules.creating")}
                </>
              ) : (
                t("bookshelfRules.create")
              )}
            </Button>
          </div>
          {ruleError && <p className="mt-2 text-xs text-destructive">{ruleError}</p>}
        </section>
      ) : (
        <PremiumLockState
          className="mb-6"
          variant="panel"
          feature={t("bookshelfRules.title")}
          description={t("bookshelfRules.lockedDescription")}
        />
      )}

      {/* Weekly email digest */}
      {isPremium && (
        <section className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium text-foreground">
            <Mail className="h-4 w-4" /> {t("digest.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("digest.description")}</p>
          <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
            <span className="text-sm text-foreground">{t("digest.toggleLabel")}</span>
            <Switch
              checked={digestEnabled}
              disabled={digestSaving}
              onCheckedChange={(checked) => void onToggleDigest(checked)}
            />
          </div>
        </section>
      )}

      {/* Account */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-medium text-foreground">
          {t("settings.accountTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.accountDesc")}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-4 w-4" /> {t("settings.signOutBtn")}
          </Button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-destructive/30 bg-card p-6">
        <h2 className="font-display text-lg font-medium text-destructive">
          {t("settingsDanger.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settingsDanger.description")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> {t("settingsDanger.clearCache")}
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={openDeleteDialog}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> {t("settingsDanger.deleteAccount")}
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("settingsDanger.note")}</p>
      </section>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settingsDanger.clearCacheTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settingsDanger.clearCacheDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearLibrary}
            >
              {t("settingsDanger.clearCacheConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settingsDanger.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settingsDanger.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">{t("settingsDanger.password")}</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              aria-invalid={!!deleteError}
              autoComplete="current-password"
            />
            {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteAccount();
              }}
            >
              {deleting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("settingsDanger.deleting")}
                </span>
              ) : (
                t("settingsDanger.deleteAccount")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
