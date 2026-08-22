"use client";

/**
 * Which skills the operator has starred.
 *
 * Per-user and persistent: the list lives on the user's row and is handed to
 * this provider by the root layout, which has already read the session. So the
 * first paint is already correct — there is no fetch on mount and no moment
 * where the stars are all hollow before the real answer arrives.
 *
 * Writes go to `POST /api/favorites`, one slug at a time. The local state is
 * updated first and the request corrects it afterwards, because a star has to
 * feel instant and the round trip is not free; a request that fails puts the
 * star back rather than leaving the screen claiming something the database
 * does not agree with.
 *
 * The provider sits above both consumers: the rail stars an entry, and the
 * dashboard lists what has been starred, and neither is an ancestor of the
 * other.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FavoritesValue = {
  /** Slugs, in the order they were starred. */
  favorites: string[];
  isFavorite: (slug: string) => boolean;
  toggle: (slug: string) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({
  children,
  initial,
  /**
   * Whether there is a session to save against. On the sign-in, sign-up and
   * standalone-legal screens there is not, and no request should be made —
   * none of those screens shows a star, so this only guards the impossible.
   */
  signedIn,
}: {
  children: React.ReactNode;
  initial: string[];
  signedIn: boolean;
}) {
  const [favorites, setFavorites] = useState<string[]>(initial);

  /**
   * The same list, readable synchronously.
   *
   * `toggle` has to know what is starred *now* to decide what to send and what
   * to roll back to, and it cannot get that from the `favorites` binding: two
   * clicks in the same tick both close over the value from the render that
   * created them, so the second would compute its next list from one that is
   * already stale.
   *
   * Deliberately not done by reading the value inside a `setFavorites`
   * updater either. React evaluates an updater immediately only while that
   * hook's queue is empty; a click landing during a pending update gets
   * deferred instead, and anything the updater was meant to hand back to the
   * caller is still undefined on the next line. That is what this file did
   * before, and the symptom was a star that lit up and was never saved.
   */
  const listRef = useRef<string[]>(initial);

  /**
   * Which request is the newest. An older reply must not overwrite the state,
   * or a star clicked while an earlier save was in flight gets undone by that
   * save's answer arriving second.
   */
  const latest = useRef(0);

  /** The one writer, so the ref and the state cannot drift apart. */
  const apply = useCallback((next: string[]): void => {
    listRef.current = next;
    setFavorites(next);
  }, []);

  /**
   * `initial` is a fresh array on every render of the layout, so it cannot be
   * the dependency below — the effect would fire on every render and throw
   * away the star that was just clicked. Its *contents* are what matters.
   *
   * A comma is an unambiguous joiner here because every slug is lower-case
   * letters and dashes; see `SKILLS` in `lib/skills.ts`.
   */
  const initialKey = initial.join(",");

  // A different account signed in on this tab, or a reset revoked the session.
  // The layout re-renders with the new list and this adopts it, rather than
  // leaving the previous account's stars on screen.
  useEffect(() => {
    // Anything still in flight was about the previous list.
    latest.current += 1;
    apply(initialKey.length > 0 ? initialKey.split(",") : []);
  }, [initialKey, apply]);

  const toggle = useCallback(
    (slug: string): void => {
      const rollback = listRef.current;
      const wanted = !rollback.includes(slug);
      const next = wanted
        ? [...rollback, slug]
        : rollback.filter((entry) => entry !== slug);

      apply(next);
      if (!signedIn) return;

      const ticket = (latest.current += 1);

      void (async () => {
        try {
          const response = await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ slug, favorite: wanted }),
          });
          if (!response.ok) {
            throw new Error(`saving "${slug}" failed (${response.status})`);
          }

          // The database's list, not the guess — it also carries whatever
          // another tab did in the meantime. Adopted only if nothing has been
          // clicked since this request went out.
          const body = (await response.json()) as { favorites?: string[] };
          if (ticket === latest.current && Array.isArray(body.favorites)) {
            apply(body.favorites);
          }
        } catch (err) {
          console.error(`[favorites] ${(err as Error).message}`);
          // Put the star back, unless a later click has already moved past
          // this one — the newer request is what decides the list then. A star
          // that pops back is legible; one that stays lit while nothing was
          // saved is not.
          if (ticket === latest.current) apply(rollback);
        }
      })();
    },
    [apply, signedIn],
  );

  const value = useMemo<FavoritesValue>(
    () => ({
      favorites,
      isFavorite: (slug) => favorites.includes(slug),
      toggle,
    }),
    [favorites, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesValue {
  const value = useContext(FavoritesContext);
  if (value === null) {
    throw new Error("useFavorites must be used inside <FavoritesProvider>");
  }
  return value;
}
