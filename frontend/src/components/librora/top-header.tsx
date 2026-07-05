import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Sparkles, LogOut, Settings as SettingsIcon, Gauge } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { AddToLibraryDialog } from "./add-to-library-dialog";
import { SearchInput } from "./search-input";
import { useMemo, useState } from "react";

const TITLE_KEYS: Record<string, TKey> = {
  "/library": "nav.library",
  "/inbox": "nav.inbox",
  "/bookshelves": "nav.bookshelves",
  "/topics": "nav.topics",
  "/reading-list": "nav.readingList",
  "/archive": "nav.archive",
  "/plan": "nav.plan",
  "/settings": "nav.settings",
  "/search": "nav.search",
};

function usePageTitle() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();
  return useMemo(() => {
    if (pathname.startsWith("/read/")) return t("nav.readingRoom");
    if (pathname.startsWith("/bookshelves/")) return t("nav.bookshelf");
    if (pathname.startsWith("/topics/")) return t("nav.topic");
    const match = Object.keys(TITLE_KEYS)
      .sort((a, b) => b.length - a.length)
      .find((p) => pathname === p || pathname.startsWith(p + "/"));
    return match ? t(TITLE_KEYS[match]) : t("nav.brand");
  }, [pathname, t]);
}

export function TopHeader() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const signOut = useStore((s) => s.signOut);
  const [q, setQ] = useState("");
  const pageTitle = usePageTitle();
  const t = useT();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q.trim() || undefined } });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <SidebarTrigger className="h-8 w-8" />

      <h1 className="type-section-title min-w-0 flex-shrink truncate text-foreground sm:max-w-[28%] lg:max-w-none">
        {pageTitle}
      </h1>

      <form onSubmit={submit} className="ml-3 hidden flex-1 max-w-xl md:block">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ("")}
          placeholder={t("header.searchPlaceholder")}
          aria-label={t("header.searchAria")}
        />
      </form>

      <Button
        variant="ghost"
        size="icon"
        className="ml-auto md:hidden"
        onClick={() => navigate({ to: "/search" })}
        aria-label={t("common.search")}
      >
        <Search />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {user.plan === "premium" ? (
          <span className="hidden items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_18%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[color-mix(in_oklab,var(--premium)_60%,var(--foreground))] sm:inline-flex">
            <Sparkles className="h-3 w-3" /> {t("header.premium")}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 lg:inline-flex"
            onClick={() => navigate({ to: "/plan" })}
          >
            {t("header.freePlan")}
          </Button>
        )}

        <LanguageSwitcher />

        <AddToLibraryDialog />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 grid h-9 w-9 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("header.accountMenu")}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{user.displayName}</div>
              <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <SettingsIcon /> {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/plan" })}>
              <Gauge /> {t("nav.plan")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut /> {t("header.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
