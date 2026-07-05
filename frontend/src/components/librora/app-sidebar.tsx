import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LibraryBig,
  Inbox,
  LayoutGrid,
  Tags,
  Bookmark,
  Archive,
  Gauge,
  Settings,
  BookOpen,
  Sparkles,
  ChevronsLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo } from "react";
import { useT, type TKey } from "@/lib/i18n";

const navItems: ReadonlyArray<{
  labelKey: TKey;
  url: "/library" | "/inbox" | "/bookshelves" | "/topics" | "/reading-list" | "/archive";
  icon: typeof LibraryBig;
  badgeKey?: "inbox";
}> = [
  { labelKey: "nav.inbox", url: "/inbox", icon: Inbox, badgeKey: "inbox" },
  { labelKey: "nav.library", url: "/library", icon: LibraryBig },
  { labelKey: "nav.bookshelves", url: "/bookshelves", icon: LayoutGrid },
  { labelKey: "nav.topics", url: "/topics", icon: Tags },
  { labelKey: "nav.readingList", url: "/reading-list", icon: Bookmark },
  { labelKey: "nav.archive", url: "/archive", icon: Archive },
];

const utility: ReadonlyArray<{
  labelKey: TKey;
  url: "/plan" | "/settings";
  icon: typeof LibraryBig;
}> = [
  { labelKey: "nav.plan", url: "/plan", icon: Gauge },
  { labelKey: "nav.settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useStore((s) => s.user);
  const items = useStore((s) => s.items);
  const navigate = useNavigate();
  const t = useT();

  const inboxAlert = useMemo(
    () =>
      items.filter(
        (i) =>
          !i.archived &&
          (i.status === "pending" || i.status === "processing" || i.status === "failed"),
      ).length,
    [items],
  );

  const isActive = (url: string) =>
    pathname === url || (url !== "/library" && pathname.startsWith(url));

  const handleNav = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-3 py-4">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          <button
            onClick={() => {
              navigate({ to: "/library" });
              handleNav();
            }}
            className={cn(
              "flex items-center gap-2.5 rounded-md transition-colors",
              collapsed ? "" : "px-1",
            )}
            aria-label={t("sidebar.homeAria")}
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="font-display text-lg font-semibold tracking-tight">
                {t("nav.brand")}
              </span>
            )}
          </button>
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              aria-label={t("sidebar.collapse")}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const label = t(item.labelKey);
                const showBadge = item.badgeKey === "inbox" && inboxAlert > 0;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={label}>
                      <Link to={item.url} onClick={handleNav} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{label}</span>
                        {showBadge && !collapsed && (
                          <span
                            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--status-processing)_18%,transparent)] px-1.5 text-[10px] font-semibold text-[var(--status-processing)]"
                            aria-label={t("sidebar.inboxBadge", { n: inboxAlert })}
                          >
                            {inboxAlert}
                          </span>
                        )}
                        {showBadge && collapsed && (
                          <span
                            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--status-processing)]"
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {utility.map((item) => {
                const label = t(item.labelKey);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={label}>
                      <Link to={item.url} onClick={handleNav} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-3">
        <Link
          to="/plan"
          onClick={handleNav}
          className={cn(
            "flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-primary/30",
            collapsed && "justify-center px-1.5",
          )}
        >
          {user.plan === "premium" ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-[var(--premium)]" />
              {!collapsed && (
                <span className="font-medium text-foreground">{t("sidebar.premium")}</span>
              )}
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span className="font-medium text-foreground">{t("sidebar.freePlan")}</span>
                  <span className="text-[10px] text-muted-foreground">{t("sidebar.upgrade")}</span>
                </div>
              )}
            </>
          )}
        </Link>

        <Link
          to="/settings"
          onClick={handleNav}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted",
            collapsed && "justify-center px-0",
          )}
          aria-label={t("sidebar.profileAria")}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-[11px] text-primary-foreground">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{user.displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          )}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
