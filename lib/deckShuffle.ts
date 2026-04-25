import AsyncStorage from "@react-native-async-storage/async-storage";

export type ShuffleState = { enabled: boolean; order: string[] };

const storageKey = (deckId: string) => `deck_shuffle_${deckId}`;

export async function loadShuffleState(deckId: string): Promise<ShuffleState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(deckId));
    if (!raw) return { enabled: false, order: [] };
    const parsed = JSON.parse(raw) as Partial<ShuffleState>;
    return {
      enabled: !!parsed.enabled,
      order: Array.isArray(parsed.order) ? parsed.order.filter((x): x is string => typeof x === "string") : [],
    };
  } catch {
    return { enabled: false, order: [] };
  }
}

export async function saveShuffleState(deckId: string, state: ShuffleState): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(deckId), JSON.stringify(state));
  } catch {
    // Non-fatal: shuffle is a UX preference
  }
}

export function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Reconcile a persisted shuffle order with the current set of card ids:
// keep persisted order, drop deleted ids, append new ids (shuffled into the tail).
export function reconcileOrder(persistedOrder: string[], currentIds: string[]): string[] {
  const currentSet = new Set(currentIds);
  const kept = persistedOrder.filter((id) => currentSet.has(id));
  const known = new Set(kept);
  const newIds = currentIds.filter((id) => !known.has(id));
  return [...kept, ...shuffleIds(newIds)];
}
