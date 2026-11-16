import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.mjs";
import { engine } from "../puzzles.mjs";
const origin = "http://127.0.0.1:8772",
  password = "Lotus garden in sunshine 42";
test("accounts, recovery, verified scoring, progress and deletion work together", async () => {
  const { app, db } = await createApp({
    baseURL: origin,
    databasePath: ":memory:",
    secret: "test-only-secret-with-at-least-32-characters",
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  const root = "http://127.0.0.1:" + server.address().port;
  let cookie = "";
  async function req(path, body, options = {}) {
    const r = await fetch(root + "/api/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookie,
        ...options,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const cookies = r.headers.getSetCookie();
    if (cookies.length) cookie = cookies.map((c) => c.split(";")[0]).join("; ");
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    return { status: r.status, body: data };
  }
  try {
    assert.equal((await req("me")).status, 401);
    assert.equal(
      (
        await req(
          "register",
          { username: "visitor", password },
          { Origin: "https://evil.test" },
        )
      ).status,
      403,
    );
    assert.equal(
      (await req("register", { username: "visitor", password: "short" }))
        .status,
      400,
    );
    let r = await req("register", { username: "visitor", password });
    assert.equal(r.status, 201, JSON.stringify(r));
    let recovery = r.body.recoveryCode;
    assert.match(recovery, /^[A-F0-9-]{39}$/);
    assert(cookie.includes("kolam"));
    assert.equal((await req("me")).body.username, "visitor");
    assert.equal(
      (await req("progress", { keys: ["n-91", "p-lace-24-12"] })).status,
      200,
    );
    assert.equal((await req("me")).body.stats.points, 0);
    assert.equal(
      (
        await req("auth/sign-up/email", {
          username: "bypass",
          name: "bypass",
          email: "a@example.com",
          password,
        })
      ).status,
      404,
    );
    const moves = [];
    const lv = engine.generate(1);
    for (let i = 0; i < lv.tiles.length; i++) {
      const c = lv.tiles[i];
      while (c.rot % c.sym && !engine.solved(lv)) {
        c.rot++;
        moves.push({ i, type: "tap" });
      }
    }
    r = await req("attempts", { puzzle: "n-1" });
    assert.equal(r.status, 200, JSON.stringify(r));
    const id = r.body.id;
    db.prepare("UPDATE attempts SET started=started-1000 WHERE id=?").run(id);
    assert.equal(
      (
        await req("attempts/" + id + "/finish", {
          moves: [{ i: 999, type: "tap" }],
        })
      ).status,
      400,
    );
    assert.equal(
      (await req("attempts/" + id + "/finish", { moves: [] })).status,
      400,
    );
    const first = await req("attempts/" + id + "/finish", {
      moves,
      points: 999999,
      elapsedMs: 1,
    });
    assert.equal(first.status, 200, JSON.stringify(first));
    assert.equal(first.body.points, 10);
    assert(first.body.elapsedMs >= 1000);
    assert.equal(first.body.hints, 0);
    assert.equal(
      (await req("attempts/" + id + "/finish", { moves })).status,
      400,
    );
    const second = await req("attempts", { puzzle: "n-1" });
    db.prepare("UPDATE attempts SET started=started-1000 WHERE id=?").run(
      second.body.id,
    );
    await req("attempts/" + second.body.id + "/finish", { moves });
    assert.equal((await req("me")).body.stats.points, 10);
    assert.equal(
      (await req("leaderboard?mode=fastest&puzzle=n-1")).body.rows[0].username,
      "visitor",
    );
    assert.equal(
      (await req("recovery-code", { password: "wrong" })).status,
      400,
    );
    const replacement = await req("recovery-code", { password });
    assert.equal(replacement.status, 200);
    assert.notEqual(replacement.body.recoveryCode, recovery);
    recovery = replacement.body.recoveryCode;
    r = await req("recover", {
      username: "visitor",
      code: "wrong",
      password: "another memorable password",
    });
    assert.equal(r.status, 400);
    r = await req("recover", {
      username: "visitor",
      code: recovery,
      password: "another memorable password",
    });
    assert.equal(r.status, 200, JSON.stringify(r));
    assert.notEqual(r.body.recoveryCode, recovery);
    assert.equal((await req("me")).status, 401);
    assert.equal(
      (await req("auth/sign-in/username", { username: "VISITOR", password }))
        .status,
      401,
    );
    assert.equal(
      (
        await req("auth/sign-in/username", {
          username: "VISITOR",
          password: "another memorable password",
        })
      ).status,
      200,
    );
    assert.equal(
      (await req("recover", { username: "visitor", code: recovery, password }))
        .status,
      400,
    );
    assert.equal(
      (await req("delete-account", { password: "another memorable password" }))
        .status,
      200,
    );
    assert.equal((await req("leaderboard")).body.rows.length, 0);
    assert.equal((await req("me")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});

test("all new packs and rolling puzzles start unsolved and have a solution", async () => {
  for (const [style] of engine.PACKS)
    for (const n of [8, 16, 24]) {
      const lv = engine.makePack(style, n, 12);
      assert(!engine.solved(lv));
      for (const c of lv.tiles) c.rot = 0;
      assert(engine.solved(lv));
    }
  for (const axis of ["h", "v"])
    for (const n of [4, 6, 10, 12]) {
      const lv = engine.makeRoll(2, n, axis);
      assert(!engine.solved(lv));
      for (const c of lv.tiles) c.rot = 0;
      assert(engine.solved(lv));
      assert.equal(lv.tiles.length, n);
    }
});

test("every ranked numbered picture has canonical rotation data", async () => {
  for (let level = 5; level <= 100000; level += 10) {
    await engine.puzzleFor("n-" + level, async () => {
      throw new Error("Missing picture equivalence data for level " + level);
    });
  }
});
