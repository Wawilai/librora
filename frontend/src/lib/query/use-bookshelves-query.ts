import { useQuery } from "@tanstack/react-query";
import { adapter } from "@/lib/api";
import { queryKeys } from "./keys";

/**
 * Consumed by routes/_app.bookshelves.tsx. Bookshelf definitions come from the API.
 */
export function useBookshelvesQuery() {
  return useQuery({
    queryKey: queryKeys.bookshelves(),
    queryFn: () => adapter.bookshelves.list(),
  });
}
