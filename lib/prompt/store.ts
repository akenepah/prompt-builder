/**
 * A tiny external store for the builder's state.
 *
 * The app is a single localStorage-backed document, which makes
 * useSyncExternalStore the right fit: the server and the hydrating
 * client both render the in-memory default, the store loads the real
 * value the moment a component subscribes, and every write is persisted
 * on a debounce rather than from a render effect.
 */

import { loadState, saveState, initialState } from "./storage";
import type { PersistedState } from "./types";

/** Stable reference for SSR and hydration — never mutated. */
const SERVER_SNAPSHOT: PersistedState = initialState();

let snapshot: PersistedState = SERVER_SNAPSHOT;
let loadedFromStorage = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function hydrateOnce(): void {
  if (loadedFromStorage || typeof window === "undefined") return;
  loadedFromStorage = true;
  snapshot = loadState();
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  hydrateOnce();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): PersistedState {
  return snapshot;
}

export function getServerSnapshot(): PersistedState {
  return SERVER_SNAPSHOT;
}

export function updateState(updater: (current: PersistedState) => PersistedState): void {
  snapshot = updater(snapshot);
  emit();
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => saveState(snapshot), 400);
}
