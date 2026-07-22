/**
 * Last-practice record, used by the Home "Continue practicing" card.
 * Written when a practice session completes; read by Home. Purely additive —
 * the practice engine itself is unchanged.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "smt.last_practice";

export interface LastPractice {
  scoreId: string;
  title: string;
  /** 0–100 */
  accuracy: number;
  at: string;
}

export async function saveLastPractice(entry: LastPractice): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entry));
}

export async function getLastPractice(): Promise<LastPractice | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastPractice;
  } catch {
    return null;
  }
}
