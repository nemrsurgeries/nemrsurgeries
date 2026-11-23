"use client";

import * as React from "react";

const listenersByKey = new Map<string, Set<() => void>>();

function notifyKey(key: string) {
  const listeners = listenersByKey.get(key);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Hydration-safe localStorage hook built on useSyncExternalStore.
 * Syncs across components in the same tab and across browser tabs.
 */
export function useLocalStorage<T extends string>(
  key: string,
  defaultValue: T,
  allowedValues?: readonly T[],
): [T, (next: T | ((prev: T) => T)) => void] {
  const getSnapshot = React.useCallback((): T => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        if (!allowedValues || allowedValues.includes(raw as T)) {
          return raw as T;
        }
      }
    } catch {
      // Ignore storage access errors
    }
    return defaultValue;
  }, [key, defaultValue, allowedValues]);

  const subscribe = React.useCallback(
    (callback: () => void) => {
      let set = listenersByKey.get(key);
      if (!set) {
        set = new Set();
        listenersByKey.set(key, set);
      }
      set.add(callback);

      const handleStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === key) {
          callback();
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => {
        set?.delete(callback);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [key],
  );

  const value = React.useSyncExternalStore<T>(
    subscribe,
    getSnapshot,
    () => defaultValue,
  );

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? next(getSnapshot()) : next;
      try {
        window.localStorage.setItem(key, resolved);
      } catch {
        // Ignore storage write errors
      }
      notifyKey(key);
    },
    [key, getSnapshot],
  );

  return [value, setValue];
}
