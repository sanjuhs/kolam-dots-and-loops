import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { openDatabase } from "./database.mjs";
import { createAuth } from "./auth.mjs";
import { createScores } from "./scores.mjs";
const hash = (s) =>
  createHash("sha256").update(s.replace(/-/g, "").toUpperCase()).digest("hex");
const newCode = () =>
  randomBytes(16).toString("hex").toUpperCase().match(/.{4}/g).join("-");
export async function createApp(config) {
  const db = openDatabase(config.databasePath),
    auth = await createAuth(db, config),
    scores = createScores(db),
    app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== config.baseURL
    )
      return res
        .status(403)
        .json({ error: "Open the game to make this request." });
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  const accounts = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  let busyAuth = 0;
  app.use(
    ["/api/register", "/api/recover", "/api/auth/sign-in"],
    (req, res, next) => {
      if (busyAuth >= 4)
        return res
          .status(503)
          .json({ error: "Please wait a moment and try again." });
      busyAuth++;
      let released = false;
      const release = () => {
        if (!released) {
          released = true;
          busyAuth--;
        }
      };
      res.once("finish", release);
      res.once("close", release);
      next();
    },
  );
  app.use(["/api/register", "/api/recover", "/api/auth/sign-in"], accounts);
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json({ limit: "192kb" }));
  app.get("/api/health", (_, res) =>
    res.json({
      status: "ok",
      version: 2,
      emailRecovery: Boolean(config.smtpURL && config.mailFrom),
    }),
  );
  app.post("/api/register", async (req, res) => {
    const { username, password, email } = req.body || {};
    if (
      typeof username !== "string" ||
      !/^[a-zA-Z0-9_]{3,24}$/.test(username) ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    )
      return res
        .status(400)
        .json({
          error:
            "Choose a 3–24 character username (letters, numbers, underscores) and a password of 12 or more characters.",
        });
    if (
      email &&
      (typeof email !== "string" ||
        email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        email.endsWith(".invalid"))
    )
      return res
        .status(400)
        .json({ error: "Check the email address, or leave it empty." });
    const response = await auth.api.signUpEmail({
      body: {
        username,
        name: username,
        email: email || `${username.toLowerCase()}@accounts.kolam.invalid`,
        password,
      },
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });
    const data = await response.json();
    if (!response.ok)
      return res
        .status(response.status)
        .json({
          error: data.message || "Please choose another username or email.",
        });
    const code = newCode();
    db.prepare("INSERT INTO recovery(user_id,code_hash) VALUES(?,?)").run(
      data.user.id,
      hash(code),
    );
    for (const cookie of response.headers.getSetCookie())
      res.append("Set-Cookie", cookie);
    res
      .status(201)
      .json({ user: { username: data.user.username }, recoveryCode: code });
  });
  app.post("/api/recover", async (req, res) => {
    const { username, code, password } = req.body || {};
    if (
      typeof username !== "string" ||
      typeof code !== "string" ||
      code.length > 80 ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    )
      return res
        .status(400)
        .json({
          error:
            "Enter your username, recovery code and a new password (12+ characters).",
        });
    const r = db
      .prepare(
        "SELECT r.*,u.id FROM recovery r JOIN user u ON u.id=r.user_id WHERE u.username=?",
      )
      .get(username.toLowerCase());
    if (
      !r ||
      !timingSafeEqual(Buffer.from(r.code_hash), Buffer.from(hash(code)))
    )
      return res
        .status(400)
        .json({ error: "The username or recovery code is incorrect." });
    const context = await auth.$context,
      encoded = await context.password.hash(password),
      next = newCode();
    const changed = db
      .prepare(
        "UPDATE recovery SET code_hash=? WHERE user_id=? AND code_hash=?",
      )
      .run(hash(next), r.id, r.code_hash);
    if (!changed.changes)
      return res
        .status(400)
        .json({ error: "This recovery code has already been used." });
    await context.internalAdapter.updatePassword(r.id, encoded);
    await context.internalAdapter.deleteUserSessions(r.id);
    res.json({ recoveryCode: next });
  });
  app.get("/api/leaderboard", (req, res) =>
    res.json({ rows: scores.leaderboard(req.query.mode, req.query.puzzle) }),
  );
  app.use("/api", async (req, res, next) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session)
      return res.status(401).json({ error: "Sign in to save your progress." });
    req.player = session.user;
    next();
  });
  app.get("/api/me", (req, res) =>
    res.json({
      username: req.player.username,
      stats: scores.stats(req.player.id),
      progress: scores.progress(req.player.id),
    }),
  );
  app.post("/api/progress", (req, res) => {
    scores.importProgress(req.player.id, req.body.keys);
    res.json({ ok: true });
  });
  app.post("/api/attempts", async (req, res) =>
    res.json(await scores.start(req.player.id, req.body.puzzle)),
  );
  app.post("/api/attempts/:id/finish", async (req, res) =>
    res.json(await scores.finish(req.player.id, req.params.id, req.body.moves)),
  );
  app.post("/api/delete-account", async (req, res) => {
    try {
      await auth.api.verifyPassword({
        body: { password: req.body.password },
        headers: fromNodeHeaders(req.headers),
      });
    } catch {
      return res
        .status(400)
        .json({ error: "Enter your current password to delete the account." });
    }
    const session = await auth.$context;
    await session.internalAdapter.deleteUserSessions(req.player.id);
    db.prepare("DELETE FROM user WHERE id=?").run(req.player.id);
    res.json({ ok: true });
  });
  app.use((error, req, res, next) => {
    const expected = /Invalid|Unknown|solved|ended|submitted|short|Choose/.test(
      error.message,
    );
    if (!expected) console.error("Request failed:", error.name);
    res
      .status(expected ? 400 : 500)
      .json({
        error: expected
          ? error.message
          : "Could not complete that request. Please try again.",
      });
  });
  return { app, db, auth, scores };
}
