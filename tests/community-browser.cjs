const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:8772";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const name = "test_" + Date.now().toString(36),
    password = "a memorable lotus garden";
  let created = false;
  try {
    await page.goto(baseURL);
    await page
      .getByRole("button", { name: "Sign in / save progress", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.locator("#registerForm [name=username]").fill(name);
    await page.locator("#registerForm [name=password]").fill(password);
    await page
      .getByRole("button", { name: "Create free account", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.getElementById("recoveryBox").hidden,
    );
    created = true;
    const authCookie = (await context.cookies()).find((c) =>
      c.name.includes("session_token"),
    );
    assert(authCookie.httpOnly);
    assert.equal(authCookie.sameSite, "Lax");
    assert.equal(authCookie.secure, new URL(baseURL).protocol === "https:");
    const download = await page
      .locator("#downloadRecovery")
      .getAttribute("href");
    assert(decodeURIComponent(download).includes(name));
    const recovery = await page.locator("#recoveryCode").textContent();
    assert(recovery.length > 30);
    await page.getByRole("button", { name: "I’ve saved it" }).click();
    await page.evaluate(() => load(1));
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      for (const c of cur.tiles) {
        while (!won && c.rot % c.sym) tap(c);
      }
    });
    await page.waitForFunction(() =>
      document
        .getElementById("scoreNote")
        .textContent.includes("difficulty points"),
    );
    await page.evaluate(() => show("home"));
    await page
      .getByRole("button", { name: "Leaderboard", exact: true })
      .click();
    await page.waitForFunction(
      (name) =>
        document.getElementById("leaderRows").textContent.includes(name),
      name,
    );
    await page.evaluate(() => show("home"));
    await page
      .getByRole("button", { name: "Your progress · " + name, exact: true })
      .click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForFunction(
      () => !document.getElementById("accountGuest").hidden,
    );
    await page
      .getByRole("button", { name: "Recover account", exact: true })
      .click();
    await page.locator("#recoverForm [name=username]").fill(name);
    await page.locator("#recoverForm [name=code]").fill(recovery);
    await page.locator("#recoverForm [name=password]").fill(password + " new");
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .getElementById("accountStatus")
        .textContent.startsWith("Password changed"),
    );
    await page.getByRole("button", { name: "I’ve saved it" }).click();
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .first()
      .click();
    await page.locator("#loginForm [name=identifier]").fill(name);
    await page.locator("#loginForm [name=password]").fill(password + " new");
    await page.locator("#loginForm button.primary").click();
    await page.waitForFunction(
      () => !document.getElementById("accountMember").hidden,
    );
    for (const key of [
      "p-lace-24-12",
      "r-peacock-12-h",
      "r-lotus-10-v",
      "g-peacock-12",
    ]) {
      await page.evaluate((key) => loadPuzzleKey(key), key);
      await page.waitForFunction((key) => cur?.link === key, key);
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      assert.equal(await page.evaluate(() => zoom), 1.5);
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        while (!won) hint();
      });
      await page.waitForFunction(() =>
        document
          .getElementById("scoreNote")
          .textContent.includes("difficulty points"),
      );
      await page.waitForTimeout(500);
      assert(await page.locator("#winBox").isVisible());
      if (process.env.SCREENSHOT_DIR)
        await page.screenshot({
          path: process.env.SCREENSHOT_DIR + "/" + key + ".png",
        });
    }
    await page.evaluate(() => show("home"));
    await page
      .getByRole("button", { name: "Your progress · " + name, exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .getElementById("playerStats")
        .textContent.includes("ranked puzzles"),
    );
    const me = await page.evaluate(() =>
      fetch("/api/me").then((r) => r.json()),
    );
    assert(me.progress.includes("n-1"));
    assert(me.progress.includes("r-peacock-12-h"));
    assert(me.stats.puzzles >= 4);
    await page.reload();
    await page.waitForFunction(() =>
      document
        .getElementById("accountBtn")
        .textContent.includes("Your progress"),
    );
    assert.equal(await page.evaluate(() => doneSet.has(1)), true);
    if (new URL(baseURL).protocol === "http:")
      await page.evaluate(() => navigator.serviceWorker.register("/sw.js"));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.evaluate(() => loadPuzzleKey("r-diya-6-h"));
    await page.waitForFunction(() => cur?.link === "r-diya-6-h");
    await page.evaluate(() => {
      while (!won) hint();
    });
    assert(
      (await page.evaluate(() => store.outbox)).some(
        (x) => x.key === "r-diya-6-h" && x.username === name,
      ),
    );
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(async () => {
      const r = await fetch("/api/me");
      return r.ok && (await r.json()).progress.includes("r-diya-6-h");
    });
    console.log(
      "PASS signed-in offline reload, practice and progress sync after reconnection",
    );
    console.log(
      "PASS sign up, cookie login, recovery, verified score, leaderboard and cross-reload progress",
    );
    console.log(
      "PASS master mandala, both rolling modes, 144-tile picture, hints, timer and zoom",
    );
    assert.deepEqual(errors, []);
    console.log("PASS no page errors");
  } finally {
    if (created) {
      const result = await page
        .evaluate(() =>
          fetch("/api/delete-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "a memorable lotus garden new" }),
          }).then((r) => r.status),
        )
        .catch(() => 0);
      console.log("Test-account cleanup status:", result);
    }
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
