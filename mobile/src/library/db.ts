/**
 * Local SQLite handle + schema for the offline score library. Metadata lives here;
 * the MusicXML documents live as files (see repository.ts).
 */
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("smt.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS scores (
          id           TEXT PRIMARY KEY NOT NULL,
          title        TEXT,
          tempo_bpm    INTEGER,
          musicxml_path TEXT NOT NULL,
          created_at   TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
