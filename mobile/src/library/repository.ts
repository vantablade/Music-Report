/**
 * Score library repository: persists scores locally (SQLite metadata + a MusicXML file on
 * disk) so the library works offline. Scores can enter via a scan, the bundled sample, or an
 * imported file — all funnel through addScore().
 */
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { getDb } from "@/library/db";
import { SAMPLE_SCORE } from "@/music/sampleScore";

export interface LibraryScore {
  id: string;
  title: string | null;
  tempo_bpm: number | null;
  musicxml_path: string;
  created_at: string;
}

const SCORES_DIR = `${FileSystem.documentDirectory}scores/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(SCORES_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(SCORES_DIR, { intermediates: true });
}

/** Write MusicXML to disk and index it. The single path used by scan/import/sample. */
export async function addScore(input: {
  id: string;
  title: string | null;
  tempoBpm: number | null;
  musicxml: string;
}): Promise<LibraryScore> {
  await ensureDir();
  const path = `${SCORES_DIR}${input.id}.musicxml`;
  await FileSystem.writeAsStringAsync(path, input.musicxml);

  const record: LibraryScore = {
    id: input.id,
    title: input.title,
    tempo_bpm: input.tempoBpm,
    musicxml_path: path,
    created_at: new Date().toISOString(),
  };

  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO scores (id, title, tempo_bpm, musicxml_path, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    record.id,
    record.title,
    record.tempo_bpm,
    record.musicxml_path,
    record.created_at,
  );
  return record;
}

/** Add the bundled sample score (idempotent — fixed id replaces on reload). */
export async function loadSampleScore(): Promise<LibraryScore> {
  return addScore({
    id: SAMPLE_SCORE.id,
    title: SAMPLE_SCORE.title,
    tempoBpm: SAMPLE_SCORE.tempoBpm,
    musicxml: SAMPLE_SCORE.musicxml,
  });
}

/** Let the user pick a MusicXML file to import. Returns null if cancelled. */
export async function importMusicXML(): Promise<LibraryScore | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/xml", "text/xml", "application/vnd.recordare.musicxml+xml", "*/*"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;

  const asset = res.assets[0];
  if (asset.name?.toLowerCase().endsWith(".mxl")) {
    // .mxl is a zip; we only read plain MusicXML here.
    throw new Error("Compressed .mxl isn't supported yet — export uncompressed MusicXML (.musicxml).");
  }

  const musicxml = await FileSystem.readAsStringAsync(asset.uri);
  const title = asset.name?.replace(/\.(musicxml|xml)$/i, "") ?? "Imported score";
  return addScore({ id: `import-${Date.now()}`, title, tempoBpm: null, musicxml });
}

export async function listScores(): Promise<LibraryScore[]> {
  const db = await getDb();
  return db.getAllAsync<LibraryScore>("SELECT * FROM scores ORDER BY created_at DESC");
}

export async function getScore(id: string): Promise<LibraryScore | null> {
  const db = await getDb();
  return db.getFirstAsync<LibraryScore>("SELECT * FROM scores WHERE id = ?", id);
}

export async function readMusicXML(score: LibraryScore): Promise<string> {
  return FileSystem.readAsStringAsync(score.musicxml_path);
}

export async function deleteScore(id: string): Promise<void> {
  const db = await getDb();
  const score = await getScore(id);
  if (score) await FileSystem.deleteAsync(score.musicxml_path, { idempotent: true });
  await db.runAsync("DELETE FROM scores WHERE id = ?", id);
}
