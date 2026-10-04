import type { StateStorage } from "zustand/middleware";

let unavailable = false;
export const storageUnavailable = () => unavailable;
export const serverStorageStatus = () => false;
const listeners = new Set<() => void>();
export function subscribeStorage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function reportFailure() {
  unavailable = true;
  listeners.forEach(listener => listener());
}

/** A denied/quota-limited store must not abort a game or resurrect stale data. */
export function createSafeStorage(getStorage: () => StateStorage, onFailure = reportFailure): StateStorage {
  const memory = new Map<string, string>();
  let failed = false;
  const fail = () => { failed = true; onFailure(); };
  return {
    getItem(name) {
      if (failed) return memory.get(name) ?? null;
      try {
        const raw = getStorage().getItem(name);
        if (typeof raw !== "string") return null;
        // Reject malformed JSON before Zustand's JSON parser runs.
        JSON.parse(raw);
        memory.set(name, raw);
        return raw;
      } catch {
        fail();
        return memory.get(name) ?? null;
      }
    },
    setItem(name, value) {
      memory.set(name, value);
      if (failed) return;
      try { getStorage().setItem(name, value); } catch {
        try { getStorage().removeItem(name); } catch { /* Best effort stale-save removal. */ }
        fail();
      }
    },
    removeItem(name) {
      memory.delete(name);
      try { getStorage().removeItem(name); } catch { fail(); }
    },
  };
}
