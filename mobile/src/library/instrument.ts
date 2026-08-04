/**
 * Per-score instrument choice, stored additively in AsyncStorage (keyed by score id) so we
 * don't need a SQLite migration. Drives playback timbre and the analysis transposition.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_INSTRUMENT_ID } from "@/music/instruments";

const key = (scoreId: string) => `smt.instrument.${scoreId}`;

export async function getInstrumentId(scoreId: string): Promise<string> {
  return (await AsyncStorage.getItem(key(scoreId))) ?? DEFAULT_INSTRUMENT_ID;
}

export async function setInstrumentId(scoreId: string, instrumentId: string): Promise<void> {
  await AsyncStorage.setItem(key(scoreId), instrumentId);
}
