import {
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
  chmodSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { dayInIndia } from "./database.mjs";
export function scheduleBackups(db, databasePath) {
  const folder = join(dirname(databasePath), "backups");
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  let busy = false;
  const backup = async () => {
    const target = join(folder, dayInIndia() + ".sqlite");
    if (busy || existsSync(target)) return;
    busy = true;
    try {
      await db.backup(target);
      chmodSync(target, 0o600);
      for (const file of readdirSync(folder)
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.sqlite$/.test(f))
        .sort()
        .slice(0, -7))
        unlinkSync(join(folder, file));
    } catch {
      console.error("Local database backup failed");
    } finally {
      busy = false;
    }
  };
  backup();
  const timer = setInterval(backup, 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
