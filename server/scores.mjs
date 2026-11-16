import { randomUUID } from "node:crypto";
import { engine, samplePicture, validateMoves } from "./puzzles.mjs";
import { dayInIndia } from "./database.mjs";
export function createScores(db) {
  const addProgress = db.prepare(
    "INSERT OR IGNORE INTO progress(user_id,puzzle) VALUES(?,?)",
  );
  return {
    progress: (user) =>
      db
        .prepare(
          "SELECT puzzle FROM progress WHERE user_id=? ORDER BY puzzle LIMIT 10000",
        )
        .all(user)
        .map((r) => r.puzzle),
    importProgress(user, keys) {
      if (
        !Array.isArray(keys) ||
        keys.length > 10000 ||
        keys.some(
          (k) =>
            typeof k !== "string" ||
            !/^(n-[1-9]\d{0,5}|g-[a-z]+-\d{1,2}|m-\d{1,2}-\d{1,2}|p-[a-z]+-\d{1,2}-\d{1,2}|r-[a-z]+-\d{1,2}-[hv])$/.test(
              k,
            ),
        )
      )
        throw Error("Invalid progress");
      if (
        db
          .prepare("SELECT COUNT(*) AS n FROM progress WHERE user_id=?")
          .get(user).n +
          keys.length >
        10000
      )
        throw Error("Progress limit reached");
      db.transaction(() => {
        for (const key of keys) addProgress.run(user, key);
      })();
    },
    async start(user, key) {
      if (typeof key !== "string" || key.length > 80)
        throw Error("Unknown puzzle");
      await engine.puzzleFor(key, samplePicture);
      const now = Date.now();
      db.prepare("DELETE FROM attempts WHERE started<?").run(now - 86400000);
      db.prepare(
        "DELETE FROM attempts WHERE user_id=? AND id NOT IN (SELECT id FROM attempts WHERE user_id=? ORDER BY started DESC LIMIT 19)",
      ).run(user, user);
      const id = randomUUID();
      db.prepare(
        "INSERT INTO attempts(id,user_id,puzzle,started) VALUES(?,?,?,?)",
      ).run(id, user, key, now);
      return { id, startedAt: now };
    },
    async finish(user, id, moves) {
      const a = db
        .prepare("SELECT * FROM attempts WHERE id=? AND user_id=?")
        .get(id, user);
      if (!a || a.finished || Date.now() - a.started > 86400000)
        throw Error("This timed attempt has ended. Play again to rank it.");
      const lv = await engine.puzzleFor(a.puzzle, samplePicture),
        result = validateMoves(lv, moves),
        now = Date.now(),
        elapsed = now - a.started;
      if (elapsed < 300) throw Error("Solve time is too short");
      const best = result.hints ? null : elapsed,
        day = dayInIndia();
      db.transaction(() => {
        const consumed = db
          .prepare(
            "UPDATE attempts SET finished=? WHERE id=? AND finished IS NULL",
          )
          .run(now, id);
        if (!consumed.changes) throw Error("Already submitted");
        addProgress.run(user, a.puzzle);
        db.prepare(
          `INSERT INTO scores(user_id,puzzle,points,best_ms,updated) VALUES(?,?,?,?,?) ON CONFLICT(user_id,puzzle) DO UPDATE SET points=MAX(points,excluded.points),best_ms=CASE WHEN best_ms IS NULL THEN excluded.best_ms WHEN excluded.best_ms IS NULL THEN best_ms ELSE MIN(best_ms,excluded.best_ms) END,solves=solves+1,updated=excluded.updated`,
        ).run(user, a.puzzle, result.points, best, now);
        db.prepare(
          `INSERT INTO daily_scores(day,user_id,puzzle,points,best_ms) VALUES(?,?,?,?,?) ON CONFLICT(day,user_id,puzzle) DO UPDATE SET points=MAX(points,excluded.points),best_ms=CASE WHEN best_ms IS NULL THEN excluded.best_ms WHEN excluded.best_ms IS NULL THEN best_ms ELSE MIN(best_ms,excluded.best_ms) END`,
        ).run(day, user, a.puzzle, result.points, best);
      })();
      return { ...result, elapsedMs: elapsed };
    },
    leaderboard(mode, key) {
      if (mode === "fastest") {
        if (typeof key !== "string" || key.length > 80)
          throw Error("Choose a puzzle");
        return db
          .prepare(
            `SELECT u.username,s.best_ms AS milliseconds,s.points FROM scores s JOIN user u ON u.id=s.user_id WHERE s.puzzle=? AND s.best_ms IS NOT NULL ORDER BY s.best_ms,u.username LIMIT 50`,
          )
          .all(key);
      }
      if (mode === "today")
        return db
          .prepare(
            `SELECT u.username,SUM(s.points) AS points,COUNT(*) AS puzzles FROM daily_scores s JOIN user u ON u.id=s.user_id WHERE s.day=? GROUP BY s.user_id ORDER BY points DESC,puzzles DESC,u.username LIMIT 50`,
          )
          .all(dayInIndia());
      return db
        .prepare(
          `SELECT u.username,SUM(s.points) AS points,COUNT(*) AS puzzles FROM scores s JOIN user u ON u.id=s.user_id GROUP BY s.user_id ORDER BY points DESC,puzzles DESC,u.username LIMIT 50`,
        )
        .all();
    },
    stats: (user) =>
      db
        .prepare(
          "SELECT COALESCE(SUM(points),0) AS points,COUNT(*) AS puzzles,MIN(best_ms) AS bestMs FROM scores WHERE user_id=?",
        )
        .get(user),
  };
}
