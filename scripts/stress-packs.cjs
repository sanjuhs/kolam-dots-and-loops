const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(() => {
      const set = window.setInterval,
        clear = window.clearInterval;
      window.__activeIntervals = new Set();
      window.setInterval = (...args) => {
        const id = set(...args);
        __activeIntervals.add(id);
        return id;
      };
      window.clearInterval = (id) => {
        __activeIntervals.delete(id);
        return clear(id);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("crash", () => errors.push("renderer crash"));
    await page.goto(
      process.env.BASE_URL || "https://rangoli-design-game.vercel.app",
    );
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const slowdown = Number(process.env.CPU_SLOWDOWN || 6);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: slowdown });
    const session = await browser.newBrowserCDPSession();
    const minutes = Number(process.env.STRESS_MINUTES || 10),
      started = Date.now(),
      output = process.env.STRESS_OUTPUT || "/tmp/kolam-packs-stress.json",
      samples = [];
    let rounds = 0;
    const keys = [];
    for (const style of ["lotus", "star", "lace", "spiral", "jewel", "wheel"])
      for (const n of [8, 16, 24]) keys.push(`p-${style}-${n}-12`);
    keys.push(
      "g-peacock-12",
      "g-lotus-12",
      "g-pookalam-12",
      "g-footprints-12",
      "r-peacock-12-h",
      "r-lotus-12-v",
      "r-diya-10-h",
      "n-2000",
      "n-1999",
      "n-1988",
      "n-1985",
    );
    async function sample(label) {
      await page.evaluate(() => show("home"));
      await page.waitForTimeout(2500);
      await cdp.send("HeapProfiler.collectGarbage");
      await page.waitForTimeout(300);
      await cdp.send("HeapProfiler.collectGarbage");
      const m = Object.fromEntries(
        (await cdp.send("Performance.getMetrics")).metrics.map((x) => [
          x.name,
          x.value,
        ]),
      );
      const dom = await cdp.send("Memory.getDOMCounters");
      const counts = await page.evaluate(() => ({
        activeIntervals: __activeIntervals.size,
        levelTimers: levelTimers.size,
        voices: voices.size,
        localRecords: (store.practice || []).length,
      }));
      let rss = 0;
      for (const p of (
        await session.send("SystemInfo.getProcessInfo")
      ).processInfo.filter((p) => p.type === "renderer"))
        try {
          rss += Number(
            execFileSync("ps", ["-o", "rss=", "-p", String(p.id)], {
              encoding: "utf8",
            }).trim(),
          );
        } catch {}
      const s = {
        label,
        minutes: +((Date.now() - started) / 60000).toFixed(2),
        rounds,
        heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(3),
        rendererRSSMB: +(rss / 1024).toFixed(1),
        ...dom,
        ...counts,
      };
      samples.push(s);
      fs.writeFileSync(
        output,
        JSON.stringify(
          {
            configuration: {
              minutes,
              cpuSlowdown: slowdown,
              viewport: "390x844",
              dpr: 2,
              physicalMemoryLimit: false,
              keys,
            },
            samples,
            errors,
          },
          null,
          2,
        ),
      );
      console.log(JSON.stringify(s));
      if (counts.activeIntervals || counts.levelTimers || counts.voices)
        throw Error("Resources remain active after leaving play");
    }
    await sample("cold");
    let checkpoint = Date.now() + 120000;
    while (Date.now() - started < minutes * 60000) {
      const key = keys[rounds % keys.length];
      await page.evaluate((key) => loadPuzzleKey(key), key);
      await page.waitForFunction(
        (key) => cur && Puzzles.puzzleKey(cur) === key,
        key,
      );
      await page.waitForTimeout(60);
      await page.evaluate(() => {
        for (const c of cur.tiles.filter((c) => c.sym > 1).slice(0, 3)) {
          if (won) break;
          c.g.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
            }),
          );
        }
        let guard = 0;
        while (!won && guard++ < 500) hint();
        if (!won) throw Error("Could not solve " + Puzzles.puzzleKey(cur));
      });
      await page.waitForTimeout(380);
      rounds++;
      if (rounds % 10 === 0)
        await page.evaluate(() => {
          show("gallery");
          show("levels");
          show("home");
        });
      if (Date.now() >= checkpoint) {
        await sample("checkpoint");
        checkpoint = Date.now() + 120000;
      }
    }
    await sample("end");
    await page.waitForTimeout(10000);
    await sample("after-idle");
    if (process.env.MEMORY_PRESSURE) {
      await session.send("Memory.simulatePressureNotification", {
        level: "critical",
      });
      await page.waitForTimeout(10000);
      await sample("after-critical-pressure");
    }
    console.log("COMPLETE", JSON.stringify({ rounds, errors }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
