import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/librora/app-sidebar";
import { TopHeader } from "@/components/librora/top-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { adapter, ApiError } from "@/lib/api";
import { pingExtension, handoffToExtension } from "@/lib/extension-bridge";
import { useT } from "@/lib/i18n";
import { noIndexSeo } from "@/lib/seo";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/_app")({
  head: () => ({
    meta: noIndexSeo("Librora App", "/library", "Your private Librora workspace."),
  }),
  component: AppLayout,
});

function AppLayout() {
  const signedIn = useStore((s) => s.signedIn);
  const navigate = useNavigate();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const signOut = useStore((s) => s.signOut);
  const updateItem = useStore((s) => s.updateItem);
  const setPlan = useStore((s) => s.setPlan);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !signedIn) {
      navigate({ to: "/login" });
    }
  }, [mounted, signedIn, navigate]);

  const handleSessionExpired = () => {
    setSessionExpired(false);
    signOut();
    navigate({ to: "/login" });
  };

  useEffect(() => {
    if (!signedIn) return;
    adapter.auth
      .session()
      .then(({ authenticated, user }) => {
        if (!authenticated || !user) {
          setSessionExpired(true);
          return;
        }
        setPlan(user.plan);
        adapter.items
          .list()
          .then((serverItems) => {
            useStore.setState({ items: serverItems });
          })
          .catch(() => null);
      })
      .catch(() => setSessionExpired(true));
    // Re-run when signedIn changes — Zustand's persist middleware rehydrates
    // asynchronously, so signedIn can still be false on the very first effect
    // run right after a page load/refresh.
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    // Items saved from elsewhere (the browser extension, another tab) never
    // reach this tab's store on their own — there's no push channel, only the
    // 5s poll below for status changes on items this tab already knows about.
    // Refetching the full list on window focus is the cheapest fix: it covers
    // "save via extension, alt-tab back to Librora" without needing a content
    // script or any extension-side changes.
    const onFocus = () => {
      adapter.items
        .list()
        .then((serverItems) => {
          // Keep any optimistic (not-yet-server-confirmed) local items the
          // server list doesn't have yet, rather than dropping them.
          const serverIds = new Set(serverItems.map((i) => i.id));
          const pendingLocal = useStore
            .getState()
            .items.filter((i) => i.id.startsWith("tmp_") && !serverIds.has(i.id));
          useStore.setState({ items: [...pendingLocal, ...serverItems] });
        })
        .catch(() => null);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    // Silent no-op if the extension isn't installed — most users won't have it.
    pingExtension()
      .then((installed) => {
        if (!installed) return;
        return adapter.auth.extensionHandoff().then((tokens) =>
          handoffToExtension({
            accessToken: tokens.accessToken,
            expiresIn: tokens.accessTokenExpiresIn,
          }),
        );
      })
      .catch(() => null);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const tick = () => {
      const processing = useStore
        .getState()
        .items.filter((i) => i.status === "pending" || i.status === "processing");
      if (!processing.length) return;
      processing.forEach((item) => {
        adapter.items
          .get(item.id)
          .then((updated) => {
            updateItem(item.id, updated);
          })
          .catch((err) => {
            if (err instanceof ApiError && err.httpStatus === 401) {
              setSessionExpired(true);
            }
          });
      });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [signedIn, updateItem]);

  if (!mounted || !signedIn) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        Opening your library...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main id="main-content" className="min-w-0 flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Dialog
        open={sessionExpired}
        onOpenChange={(open) => {
          if (!open) handleSessionExpired();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t("dialogs.sessionExpiredTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.sessionExpiredDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSessionExpired} className="gap-1.5">
              <LogIn className="h-4 w-4" />
              {t("dialogs.signInAgain")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
