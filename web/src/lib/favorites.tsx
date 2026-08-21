"use client";

/**
 * Which skills the operator has starred.
 *
 * In memory for the length of the tab and no further. There is no user table
 * to hang a favourites column off yet — Phase 5 is what gives this a per-user
 * home — and a `localStorage` stopgap would only look persistent while being
 * per-browser, which is a worse lie than losing it on reload.
 *
 * The provider sits above both consumers: the rail stars an entry, and the
 * dashboard lists what has been starred, and neither is an ancestor of the
 * other.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type FavoritesValue = {
  /** Slugs, in the order they were starred. */
  favorites: string[];
  isFavorite: (slug: string) => boolean;
  toggle: (slug: string) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggle = useCallback((slug: string): void => {
    setFavorites((current) =>
      current.includes(slug)
        ? current.filter((entry) => entry !== slug)
        : [...current, slug],
    );
  }, []);

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
