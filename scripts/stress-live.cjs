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
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("crash", () => errors.push("renderer crash"));
    await page.goto(
      process.env.BASE_URL || "https://rangoli-design-game.vercel.app/",
    );
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    const session = await browser.newBrowserCDPSession();
    const samples = [];
    let levels = 0,
      taps = 0,
      hints = 0;
    const started = Date.now();
    const minutes = Number(process.env.STRESS_MINUTES || 20);
    async function sample(label) {
      await page.evaluate(() => {
        load(2000);
        store.sound = false;
        stopAudio();
      });
      await page.waitForTimeout(2500);
      await cdp.send("HeapProfiler.collectGarbage");
      await page.waitForTimeout(300);
      await cdp.send("HeapProfiler.collectGarbage");
      const { metrics } = await cdp.send("Performance.getMetrics");
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      const dom = await cdp.send("Memory.getDOMCounters");
      const info = await session.send("SystemInfo.getProcessInfo");
      let rssKB = 0;
      for (const p of info.processInfo.filter((p) => p.type === "renderer"))
        try {
          rssKB += Number(
            execFileSync("ps", ["-o", "rss=", "-p", String(p.id)], {
              encoding: "utf8",
            }).trim(),
          );
        } catch {}
      const s = {
        label,
        minutes: Number(((Date.now() - started) / 60000).toFixed(2)),
        levels,
        taps,
        hints,
        heapMB: Number((m.JSHeapUsedSize / 1048576).toFixed(3)),
        rendererRSSMB: Number((rssKB / 1024).toFixed(1)),
        ...dom,
        errors: errors.length,
      };
      samples.push(s);
      fs.writeFileSync(
        process.env.STRESS_OUTPUT || "/tmp/kolam-long-session.json",
        JSON.stringify(
          {
            configuration: {
              durationMinutes: minutes,
              cpuSlowdown: 6,
              viewport: "390x844",
              dpr: 2,
              advertisedMemoryGB: 2,
              physicalMemoryLimit: false,
            },
            samples,
            errors,
          },
          null,
          2,
        ),
      );
      console.log(JSON.stringify(s));
    }
    await sample("baseline");
    let next = Date.now() + 120000;
    while (Date.now() - started < minutes * 60000) {
      const L = 1 + (levels % 2000);
      await page.evaluate(async (L) => {
        load(L);
        for (let i = 0; i < 100 && !cur; i++)
          await new Promise((r) => setTimeout(r, 20));
      }, L);
      await page.waitForFunction((L) => cur?.n === L, L, { timeout: 10000 });
      const counts = await page.evaluate(() => {
        store.sound = true;
        let t = 0,
          h = 0;
        for (const c of cur.tiles.filter((c) => c.sym > 1).slice(0, 4)) {
          if (won) break;
          c.g.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
            }),
          );
          t++;
        }
        while (!won && h < 500) {
          hint();
          h++;
        }
        return { t, h, won };
      });
      taps += counts.t;
      hints += counts.h;
      if (!counts.won) throw Error("Could not solve " + L);
      levels++;
      await page.waitForTimeout(380);
      if (levels % 10 === 0)
        await page.evaluate(() => {
          show("levels");
          show("gallery");
          show("home");
        });
      if (Date.now() >= next) {
        await sample("checkpoint");
        next = Date.now() + 120000;
      }
    }
    await sample("end");
    await page.evaluate(() => show("home"));
    await page.waitForTimeout(10000);
    await sample("after-idle");
    console.log("COMPLETE", JSON.stringify({ levels, taps, hints, errors }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
