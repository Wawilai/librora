import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type Dict } from "./locales/en";
import { th } from "./locales/th";

export type Lang = "en" | "th";

export const DICTS: Record<Lang, Dict> = { en, th };
const STORAGE_KEY = "librora-lang";

// For call sites outside React (e.g. Zustand store actions) that need a
// translated string but can't use useT()/useI18n() hooks.
export function getCurrentLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "th" || stored === "en" ? stored : "en";
}

// Build dot-path keys from the dictionary type.
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dict>;

function getPath(obj: unknown, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage on the client (avoid SSR mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "th" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = useCallback<I18nValue["t"]>(
    (key, vars) => {
      const value = getPath(DICTS[lang], key) ?? getPath(DICTS.en, key) ?? key;
      return interpolate(value, vars);
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}
