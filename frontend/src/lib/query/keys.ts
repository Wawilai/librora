/** Centralized React Query key factory. */
export const queryKeys = {
  bookshelves: () => ["bookshelves"] as const,
  items: {
    all: () => ["items"] as const,
    detail: (id: string) => ["items", id] as const,
    bookshelf: (slug: string) => ["items", "bookshelf", slug] as const,
  },
};
