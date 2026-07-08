import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DB_DIR = resolve(import.meta.dir, "../../data");
const DB_PATH = resolve(DB_DIR, "archprep.db");

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (dbInstance) return dbInstance;

  mkdirSync(DB_DIR, { recursive: true });
  dbInstance = new Database(DB_PATH, { create: true });
  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA foreign_keys = ON;");
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
