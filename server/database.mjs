import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
 CREATE TABLE IF NOT EXISTS recovery(user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE, code_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS progress(user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, puzzle TEXT NOT NULL, PRIMARY KEY(user_id,puzzle));
 CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,puzzle TEXT NOT NULL,started INTEGER NOT NULL,finished INTEGER);
 CREATE INDEX IF NOT EXISTS attempts_user ON attempts(user_id,started);
 CREATE TABLE IF NOT EXISTS scores(user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,puzzle TEXT NOT NULL,points INTEGER NOT NULL,best_ms INTEGER,solves INTEGER NOT NULL DEFAULT 1,updated INTEGER NOT NULL,PRIMARY KEY(user_id,puzzle));
 CREATE TABLE IF NOT EXISTS daily_scores(day TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,puzzle TEXT NOT NULL,points INTEGER NOT NULL,best_ms INTEGER,PRIMARY KEY(day,user_id,puzzle));
 `);
  return db;
}
export const dayInIndia = (time = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(time);
