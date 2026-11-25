import { useSyncExternalStore } from "react";

// Tema html'deki `dark` sınıfıdır (index.html ilk boyamadan önce kurar); seçim localStorage'da.
const listeners = new Set<() => void>();
const isDark = () => document.documentElement.classList.contains("dark");

export function useTheme() {
  const dark = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isDark,
  );
  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    for (const l of listeners) l();
  };
  return { theme: dark ? ("dark" as const) : ("light" as const), toggle };
}
