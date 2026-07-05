import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import type { ItemStatus, LibraryItem, MockUser, PlanTier } from "@/lib/api/types";
import { domainOf } from "@/lib/bookshelves";
import { fetchAdapter } from "@/lib/api/fetch-adapter";
import { DICTS, getCurrentLang } from "@/lib/i18n";

interface State {
  signedIn: boolean;
  user: MockUser;
  items: LibraryItem[];

  // session
  signIn: (email?: string, displayName?: string) => void;
  signOut: () => void;
  setPlan: (plan: PlanTier) => void;
  setDisplayName: (n: string) => void;

  // items
  addItem: (input: { url: string; customTitle?: string; note?: string; tags?: string[] }) => string;
  updateItem: (id: string, patch: Partial<LibraryItem>) => void;
  setNote: (id: string, note: string) => void;
  toggleReadingList: (id: string) => void;
  archive: (id: string) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
  reprocess: (id: string) => void;
  retry: (id: string) => void;

  // tags
  renameTag: (oldTag: string, newTag: string) => void;
  deleteTag: (tag: string) => void;
}

function uid() {
  return `tmp_${Date.now().toString(36)}`;
}

// Every mutating action below is optimistic (updates local state immediately,
// fires the real API call in the background) and needs to revert on failure —
// but reverting silently leaves the user with no idea their action didn't
// actually happen. Centralized here so every call site shows the same toast.
function notifyActionFailed() {
  toast.error(DICTS[getCurrentLang()].toasts.error);
}

const defaultUser: MockUser = {
  id: "usr_local",
  email: "you@librora.app",
  displayName: "Reader",
  plan: "free",
  initials: "R",
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      signedIn: false,
      user: defaultUser,
      items: [],

      signIn: (email, displayName) =>
        set((s) => ({
          signedIn: true,
          user: {
            ...s.user,
            email: email ?? s.user.email,
            displayName: displayName ?? s.user.displayName,
            initials: (displayName ?? s.user.displayName).slice(0, 1).toUpperCase() || "R",
          },
        })),
      signOut: () => set({ signedIn: false, items: [] }),
      setPlan: (plan) => set((s) => ({ user: { ...s.user, plan } })),
      setDisplayName: (n) =>
        set((s) => ({
          user: {
            ...s.user,
            displayName: n || "Reader",
            initials: (n || "R").slice(0, 1).toUpperCase(),
          },
        })),

      addItem: ({ url, customTitle, note, tags }) => {
        // Optimistic placeholder shown immediately while the real API call runs.
        const tempId = uid();
        const placeholder: LibraryItem = {
          id: tempId,
          url,
          domain: domainOf(url),
          title: customTitle || url,
          faviconLetter: (domainOf(url)[0] || "?").toUpperCase(),
          status: "pending",
          tags: tags ?? [],
          personalNote: note,
          addedAt: new Date().toISOString(),
        };
        set((s) => ({ items: [placeholder, ...s.items] }));

        // Fire real API call; replace placeholder with server item once created.
        fetchAdapter.items
          .create({ url, customTitle, note, tags })
          .then((serverItem) => {
            set((s) => ({
              items: s.items.map((i) => (i.id === tempId ? serverItem : i)),
            }));
          })
          .catch(() => {
            // On failure remove the optimistic placeholder so the UI doesn't show a ghost item.
            set((s) => ({ items: s.items.filter((i) => i.id !== tempId) }));
            notifyActionFailed();
          });

        return tempId;
      },

      updateItem: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),

      setNote: (id, note) => {
        // Optimistic
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, personalNote: note } : i)),
        }));
        fetchAdapter.items.setNote(id, note).catch(() => notifyActionFailed());
      },

      toggleReadingList: (id) => {
        // Optimistic
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, inReadingList: !i.inReadingList } : i)),
        }));
        fetchAdapter.items
          .toggleReadingList(id)
          .then((updated) => {
            set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
          })
          .catch(() => {
            // Revert optimistic on failure
            set((s) => ({
              items: s.items.map((i) =>
                i.id === id ? { ...i, inReadingList: !i.inReadingList } : i,
              ),
            }));
            notifyActionFailed();
          });
      },

      archive: (id) => {
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, archived: true } : i)) }));
        fetchAdapter.items.archive(id).catch(() => {
          set((s) => ({
            items: s.items.map((i) => (i.id === id ? { ...i, archived: false } : i)),
          }));
          notifyActionFailed();
        });
      },

      restore: (id) => {
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, archived: false } : i)) }));
        fetchAdapter.items.restore(id).catch(() => {
          set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, archived: true } : i)) }));
          notifyActionFailed();
        });
      },

      remove: (id) => {
        const removed = get().items.find((i) => i.id === id);
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        fetchAdapter.items.remove(id).catch(() => {
          if (removed) set((s) => ({ items: [removed, ...s.items] }));
          notifyActionFailed();
        });
      },

      reprocess: (id) => {
        const previousStatus = get().items.find((i) => i.id === id)?.status;
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: "processing" as ItemStatus } : i,
          ),
        }));
        fetchAdapter.items
          .reprocess(id)
          .then((updated) => {
            set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
          })
          .catch(() => {
            // Revert the optimistic "processing" status — otherwise a failed
            // reprocess call leaves the item stuck showing "processing" forever.
            if (previousStatus) {
              set((s) => ({
                items: s.items.map((i) => (i.id === id ? { ...i, status: previousStatus } : i)),
              }));
            }
            notifyActionFailed();
          });
      },

      retry: (id) => {
        const previousStatus = get().items.find((i) => i.id === id)?.status;
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: "processing" as ItemStatus } : i,
          ),
        }));
        fetchAdapter.items
          .retry(id)
          .then((updated) => {
            set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
          })
          .catch(() => {
            if (previousStatus) {
              set((s) => ({
                items: s.items.map((i) => (i.id === id ? { ...i, status: previousStatus } : i)),
              }));
            }
            notifyActionFailed();
          });
      },

      renameTag: (oldTag, newTag) => {
        const next = newTag.trim().toLowerCase().replace(/\s+/g, "-");
        if (!next || next === oldTag) return;
        // Optimistic local update
        set((s) => ({
          items: s.items.map((i) => {
            if (!i.tags.includes(oldTag)) return i;
            const merged = Array.from(new Set(i.tags.map((t) => (t === oldTag ? next : t))));
            return { ...i, tags: merged };
          }),
        }));
        fetchAdapter.tags.rename(oldTag, newTag).catch(() => notifyActionFailed());
      },

      deleteTag: (tag) => {
        set((s) => ({
          items: s.items.map((i) =>
            i.tags.includes(tag) ? { ...i, tags: i.tags.filter((t) => t !== tag) } : i,
          ),
        }));
        fetchAdapter.tags.remove(tag).catch(() => notifyActionFailed());
      },
    }),
    {
      name: "librora-session-v1",
      partialize: (s) => ({
        signedIn: s.signedIn,
        user: s.user,
      }),
    },
  ),
);

export const useVisibleItems = () => {
  const items = useStore((s) => s.items);
  return items.filter((i) => !i.archived);
};
export const useArchive = () => {
  const items = useStore((s) => s.items);
  return items.filter((i) => i.archived);
};
// Back-compat exports — call as hooks instead of selectors.
export const selectVisibleItems = (s: { items: LibraryItem[] }) =>
  s.items.filter((i) => !i.archived);
export const selectArchive = (s: { items: LibraryItem[] }) => s.items.filter((i) => i.archived);
