"use strict";
(function () {
  const { MOTIFS, mandalaArt, patternArt } = globalThis;
  /* ---------- chapters ---------- */
  const CHAPTERS = [
    {
      name: "Bud",
      from: 1,
      to: 20,
      note: "a few dots",
      g: ["#8a3420", "#541c10"],
    },
    {
      name: "Blossom",
      from: 21,
      to: 50,
      note: "small kolams",
      g: ["#274079", "#141f45"],
    },
    {
      name: "Lotus",
      from: 51,
      to: 90,
      note: "five and six dots wide",
      g: ["#1c5a4c", "#0d3029"],
    },
    {
      name: "Lamp",
      from: 91,
      to: 140,
      note: "bigger weaves",
      g: ["#6a2a63", "#341232"],
    },
    {
      name: "Festival",
      from: 141,
      to: 200,
      note: "grand designs",
      g: ["#7a2b3b", "#3a101b"],
    },
    {
      name: "Peacock",
      from: 201,
      to: 400,
      note: "seven to nine dots wide",
      g: ["#15506b", "#0a2a3a"],
    },
    {
      name: "Temple",
      from: 401,
      to: 700,
      note: "eight to ten dots wide",
      g: ["#7a4a1c", "#3d230b"],
    },
    {
      name: "Monsoon",
      from: 701,
      to: 1000,
      note: "wide, flowing weaves",
      g: ["#2b4a6e", "#12233a"],
    },
    {
      name: "Harvest",
      from: 1001,
      to: 1400,
      note: "for patient hands",
      g: ["#5c5a1e", "#2c2b0c"],
    },
    {
      name: "Starlight",
      from: 1401,
      to: 2000,
      note: "the most intricate",
      g: ["#3a2a66", "#1a1233"],
    },
    {
      name: "Endless",
      from: 2001,
      to: Infinity,
      note: "new kolams forever",
      g: ["#2c3140", "#14161d"],
    },
  ];
  const chapterOf = (L) => CHAPTERS.find((c) => L >= c.from && L <= c.to);
  const PAL = [
    "#f6a400",
    "#e8457a",
    "#17a69b",
    "#8a55c9",
    "#f26b21",
    "#4caf50",
    "#e53935",
    "#2f8fe0",
  ];

  /* ---------- level generation ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const I = [1, 0, 0, 1];
  const OPS = {
    D4: [
      I,
      [0, -1, 1, 0],
      [-1, 0, 0, -1],
      [0, 1, -1, 0],
      [-1, 0, 0, 1],
      [1, 0, 0, -1],
      [0, 1, 1, 0],
      [0, -1, -1, 0],
    ],
    C4: [I, [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0]],
    D2: [I, [-1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, -1]],
    C2: [I, [-1, 0, 0, -1]],
    M: [I, [-1, 0, 0, 1]],
  };
  const FEATURED = [
    ["diamond", 3, "all"],
    ["square", 3, "all"],
    ["diamond", 5, "all"],
    ["square", 4, "rings"],
    ["square", 5, "spokes"],
    ["octagon", 5, "all"],
    ["diamond", 7, "all"],
    ["square", 6, "rings"],
    ["square", 5, "all"],
    ["diamond", 9, "all"],
    ["square", 7, "spokes"],
    ["octagon", 7, "all"],
    ["square", 7, "rings"],
    ["diamond", 11, "all"],
    ["square", 8, "rings"],
    ["square", 9, "spokes"],
    ["octagon", 9, "all"],
    ["square", 8, "all"],
    ["square", 9, "rings"],
    ["diamond", 11, "all"],
  ];

  function spec(L, rng) {
    const pick = (a) => a[Math.floor(rng() * a.length)];
    if (L === 1) return { w: 2, h: 1, shape: "square", rule: "all" };
    if (L === 2) return { w: 3, h: 1, shape: "square", rule: "all" };
    if (L === 3) return { w: 2, h: 2, shape: "square", rule: "all" };
    if (L % 10 === 0) {
      const k = L / 10 - 1,
        f = k < FEATURED.length ? FEATURED[k] : FEATURED[14 + (k % 6)];
      return { w: f[1], h: f[1], shape: f[0], rule: f[2], star: true };
    }
    if (L <= 9) {
      const d = pick([
        [3, 2],
        [2, 3],
        [4, 1],
        [2, 2],
        [4, 2],
        [3, 2],
      ]);
      return { w: d[0], h: d[1], shape: "square", p: 0.6 };
    }
    if (L <= 20) {
      const d = pick([
        [3, 3, "square"],
        [3, 3, "diamond"],
        [4, 2, "square"],
        [4, 3, "square"],
        [3, 4, "square"],
        [3, 3, "square"],
      ]);
      return { w: d[0], h: d[1], shape: d[2], p: 0.62 };
    }
    const ch = chapterOf(L);
    const R = {
      Blossom: [4, 5],
      Lotus: [5, 6],
      Lamp: [6, 7],
      Festival: [8, 9],
      Peacock: [7, 9],
      Temple: [8, 10],
      Monsoon: [8, 11],
      Harvest: [9, 11],
      Starlight: [9, 11],
      Endless: [9, 11],
    }[ch.name];
    const t = ch.to === Infinity ? 0.5 : (L - ch.from) / (ch.to - ch.from);
    let n =
      R[0] +
      Math.min(
        R[1] - R[0],
        Math.floor((rng() * 0.8 + t * 0.6) * (R[1] - R[0] + 1)),
      );
    const shapes = ["square", "square"];
    if (n >= 5) shapes.push("octagon", "ring", "diamond");
    if (n >= 6) shapes.push("cross");
    let shape = pick(shapes);
    if (shape === "diamond") n = Math.min(11, (n % 2 ? n : n + 1) + 2);
    return { w: n, h: n, shape, p: 0.55 + rng() * 0.25 };
  }

  function inShape(shape, x, y, w, h) {
    const X = Math.abs(2 * x - (w - 1)) / 2,
      Y = Math.abs(2 * y - (h - 1)) / 2,
      c = (w - 1) / 2,
      n = w;
    switch (shape) {
      case "diamond":
        return X + Y <= c + 0.01;
      case "octagon":
        return X + Y <= c + Math.floor(c / 2) + 0.01;
      case "cross":
        return Math.min(X, Y) <= n / 4 - 0.5 + 0.01;
      case "ring":
        return Math.max(X, Y) >= n / 6;
      default:
        return true;
    }
  }

  function build(sp, rng, strict) {
    const { w, h } = sp,
      cells = new Map(),
      id = (x, y) => y * w + x;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (inShape(sp.shape, x, y, w, h))
          cells.set(id(x, y), { x, y, mask: 0, rot: 0 });
    const ekey = (a, b) => Math.min(a, b) + "_" + Math.max(a, b);
    const edges = [];
    for (const [i, c] of cells) {
      if (c.x + 1 < w && cells.has(i + 1)) edges.push([i, i + 1]);
      if (c.y + 1 < h && cells.has(i + w)) edges.push([i, i + w]);
    }
    const groups =
      w === h ? ["D4", "D4", "C4", "D2", "D2", "M"] : ["D2", "D2", "M", "C2"];
    const ops = OPS[groups[Math.floor(rng() * groups.length)]];
    const tf = (i, o) => {
      const c = cells.get(i),
        X = 2 * c.x - (w - 1),
        Y = 2 * c.y - (h - 1);
      return id(
        (o[0] * X + o[1] * Y + (w - 1)) / 2,
        (o[2] * X + o[3] * Y + (h - 1)) / 2,
      );
    };
    const orbitOf = new Map(),
      orbits = [];
    for (const [a, b] of edges) {
      if (orbitOf.has(ekey(a, b))) continue;
      const o = { keys: new Set(), on: false };
      for (const op of ops) {
        const k = ekey(tf(a, op), tf(b, op));
        o.keys.add(k);
        orbitOf.set(k, o);
      }
      orbits.push(o);
    }
    const cheb = (i) => {
      const c = cells.get(i);
      return Math.max(Math.abs(2 * c.x - (w - 1)), Math.abs(2 * c.y - (h - 1)));
    };
    const onAxis = (i) => {
      const c = cells.get(i);
      return 2 * c.x === w - 1 || 2 * c.y === h - 1;
    };
    const on = new Set();
    if (sp.rule) {
      for (const [a, b] of edges) {
        if (
          sp.rule === "all" ||
          cheb(a) === cheb(b) ||
          (sp.rule === "spokes" &&
            onAxis(a) &&
            onAxis(b) &&
            (cells.get(a).x === cells.get(b).x
              ? 2 * cells.get(a).x === w - 1
              : 2 * cells.get(a).y === h - 1))
        )
          on.add(ekey(a, b));
      }
    } else {
      for (const o of orbits) o.on = rng() < sp.p;
      const deg = new Map();
      const recount = () => {
        deg.clear();
        for (const [a, b] of edges)
          if (orbitOf.get(ekey(a, b)).on) {
            deg.set(a, (deg.get(a) || 0) + 1);
            deg.set(b, (deg.get(b) || 0) + 1);
          }
      };
      for (let guard = 0; guard < 200; guard++) {
        recount();
        const lonely = edges.filter(([a, b]) => !deg.get(a) || !deg.get(b));
        if (!lonely.length) break;
        const e = lonely[Math.floor(rng() * lonely.length)];
        orbitOf.get(ekey(e[0], e[1])).on = true;
      }
      if (strict && orbits.length > 1 && orbits.every((o) => o.on)) return null;
      for (const [a, b] of edges)
        if (orbitOf.get(ekey(a, b)).on) on.add(ekey(a, b));
    }
    const manh = sp.shape === "diamond" || (!sp.rule && rng() < 0.35),
      off = Math.floor(rng() * PAL.length);
    let turnable = 0;
    for (const [i, c] of cells) {
      const nb = [i - w, c.x + 1 < w ? i + 1 : -1, i + w, c.x > 0 ? i - 1 : -1];
      nb.forEach((j, d) => {
        if (j >= 0 && cells.has(j) && on.has(ekey(i, j))) c.mask |= 1 << d;
      });
      const m = c.mask,
        bits = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
      c.sym = bits === 0 || bits === 4 ? 1 : m === 5 || m === 10 ? 2 : 4;
      if (c.sym > 1) turnable++;
      const X = Math.abs(2 * c.x - (w - 1)),
        Y = Math.abs(2 * c.y - (h - 1));
      c.ring = Math.round((manh ? X + Y : Math.max(X, Y)) / 2);
      c.color = PAL[(c.ring + off) % PAL.length];
    }
    if (turnable < 1) return null;
    return {
      kind: "kolam",
      w,
      h,
      cells,
      tiles: [...cells.values()],
      star: !!sp.star,
      id,
    };
  }

  function conn(c, d) {
    return (c.mask >> ((((d - c.rot) % 4) + 4) % 4)) & 1;
  }
  const DX = [0, 1, 0, -1],
    DY = [-1, 0, 1, 0];
  function neighbour(lv, c, d) {
    const x = c.x + DX[d],
      y = c.y + DY[d];
    if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) return null;
    return lv.cells.get(lv.id(x, y)) || null;
  }
  function tileOk(lv, c) {
    for (let d = 0; d < 4; d++) {
      const n = neighbour(lv, c, d),
        a = conn(c, d);
      if (n ? a !== conn(n, (d + 2) % 4) : a) return false;
    }
    return true;
  }
  const off = (lv, c) =>
    lv.kind === "man"
      ? (((c.rot - lv.tiles[lv.tiles.length - 1].rot) % c.sym) + c.sym) % c.sym
      : c.rot % c.sym;
  function solved(lv) {
    if (lv.kind !== "kolam") return lv.tiles.every((c) => off(lv, c) === 0);
    for (const c of lv.cells.values()) if (!tileOk(lv, c)) return false;
    return true;
  }

  function generate(L) {
    for (let attempt = 0; ; attempt++) {
      const rng = mulberry32(L * 7919 + attempt * 104729 + 17);
      const lv = build(spec(L, rng), rng, attempt < 6);
      if (!lv) continue;
      const turn = [...lv.cells.values()].filter((c) => c.sym > 1);
      for (let tries = 0; tries < 50; tries++) {
        for (const c of turn) c.rot = Math.floor(rng() * 4);
        if (
          !solved(lv) &&
          turn.filter((c) => c.rot % c.sym).length >= Math.min(2, turn.length)
        )
          break;
      }
      if (solved(lv)) turn[0].rot = 1;
      lv.n = L;
      return lv;
    }
  }

  const isPic = (L) => L % 10 === 5;
  const picSize = (L) =>
    L <= 20
      ? 2
      : L <= 50
        ? 3
        : L <= 140
          ? 4
          : L <= 400
            ? 5
            : L % 20 === 5
              ? 5
              : 6;
  function pictureHash(art, n) {
    let a = 2166136261,
      b = 2246822519;
    for (let i = 0; i < art.length; i++) {
      a = Math.imul(a ^ art.charCodeAt(i), 16777619);
      b = Math.imul(b ^ art.charCodeAt(i), 3266489917);
    }
    return n + ":" + (a >>> 0).toString(16) + ":" + (b >>> 0).toString(16);
  }
  async function makePic(mi, n, seed, sampler, signal) {
    const m = MOTIFS[mi],
      rng = mulberry32(seed * 2654435761 + n),
      art = m.draw(rng);
    const syms =
        globalThis.PictureSyms?.[pictureHash(art, n)] ||
        (await sampler(art, n, signal)),
      tiles = [];
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        tiles.push({ x, y, rot: 0, sym: syms[y * n + x] });
    const turn = tiles.filter((c) => c.sym > 1);
    for (let tries = 0; tries < 50; tries++) {
      for (const c of turn) c.rot = Math.floor(rng() * 4);
      if (
        turn.filter((c) => c.rot % c.sym).length >=
        Math.min(turn.length, Math.max(2, turn.length * 0.6))
      )
        break;
    }
    if (turn.length && turn.every((c) => c.rot % c.sym === 0)) turn[0].rot = 1;
    return {
      kind: "pic",
      size: n,
      tiles,
      art,
      motif: m,
      mi,
      title: m.name,
      sub: n + "×" + n,
      note: m.note,
      link: "g-" + m.id + "-" + n,
    };
  }
  const isMan = (L) => L % 10 === 8;
  const FOLDS = [5, 6, 7, 8, 9, 10, 12, 16];
  function makeMandala(n, k, S, seed, style) {
    const rng = mulberry32(seed * 40503 + n * 131 + k),
      art = style ? patternArt(style, n, k, rng) : mandalaArt(n, k, rng),
      tiles = [];
    for (let i = 0; i < k; i++)
      tiles.push({ i, x: i, y: 0, rot: 0, sym: S, step: 360 / (n * S) });
    const lv = {
      kind: "man",
      tiles,
      art,
      fold: n,
      title: n + "-fold mandala",
      sub: k + " rings",
      link: "m-" + n + "-" + k,
      note: `This rangavalli has ${n}-fold symmetry: the same petal repeats ${n} times around the centre.`,
    };
    for (let tries = 0; tries < 60; tries++) {
      for (const c of tiles) c.rot = Math.floor(rng() * S);
      if (
        tiles.filter((c) => off(lv, c)).length >=
        Math.max(1, Math.ceil((k - 1) * 0.6))
      )
        break;
    }
    if (solved(lv)) tiles[0].rot++;
    return lv;
  }

  const PACKS = [
    ["lotus", "Lotus garden"],
    ["star", "Star mosaic"],
    ["lace", "Lacework"],
    ["spiral", "Spiral vines"],
    ["jewel", "Jewelled mandala"],
    ["wheel", "Sun wheel"],
  ];
  function makePack(style, n, k) {
    const lv = makeMandala(
      n,
      k,
      4,
      700 + PACKS.findIndex((p) => p[0] === style),
      style,
    );
    lv.link = `p-${style}-${n}-${k}`;
    lv.title = PACKS.find((p) => p[0] === style)[1];
    lv.sub = `${n} petals · ${k} rings`;
    return lv;
  }
  function makeRoll(mi, n, axis) {
    const m = MOTIFS[mi],
      rng = mulberry32(8801 + mi * 71 + n),
      art = m.draw(rng),
      tiles = [];
    for (let i = 0; i < n; i++)
      tiles.push({
        i,
        x: axis === "h" ? 0 : i,
        y: axis === "h" ? i : 0,
        rot: 1 + Math.floor(rng() * (n - 1)),
        sym: n,
      });
    return {
      kind: "roll",
      tiles,
      art,
      size: n,
      mi,
      axis,
      title: m.name + " · rolling " + (axis === "h" ? "rows" : "columns"),
      sub: n + " strips",
      link: `r-${m.id}-${n}-${axis}`,
      note: "Roll each strip until the picture joins up.",
    };
  }
  const puzzleKey = (lv) => (lv.n ? "n-" + lv.n : lv.link);
  async function puzzleFor(key, sampler) {
    let m = key.match(/^n-(\d+)$/);
    if (m) {
      const L = +m[1];
      if (L < 1 || L > 100000) throw Error("Unknown level");
      let lv;
      if (isPic(L))
        lv = await makePic(
          ((L - 5) / 10) % MOTIFS.length,
          picSize(L),
          L,
          sampler,
        );
      else if (isMan(L)) {
        const j = (L - 8) / 10;
        lv = makeMandala(
          [6, 8, 5, 12, 10, 7, 16, 9][j % 8],
          L <= 20
            ? 2
            : L <= 50
              ? 3
              : L <= 140
                ? 4
                : L <= 400
                  ? 5
                  : L % 20 === 8
                    ? 5
                    : 6,
          L <= 140 ? 3 : 4,
          L,
        );
      } else return generate(L);
      lv.n = L;
      return lv;
    }
    m = key.match(/^g-([a-z]+)-(\d+)$/);
    if (m) {
      const mi = MOTIFS.findIndex((x) => x.id === m[1]),
        n = +m[2];
      if (mi >= 0 && [2, 3, 4, 5, 6, 8, 10, 12].includes(n))
        return makePic(mi, n, 1000 + mi, sampler);
    }
    m = key.match(/^m-(\d+)-(\d+)$/);
    if (m && FOLDS.includes(+m[1]) && +m[2] >= 2 && +m[2] <= 12)
      return makeMandala(+m[1], +m[2], +m[2] >= 5 ? 4 : 3, 500 + +m[1]);
    m = key.match(/^p-([a-z]+)-(\d+)-(\d+)$/);
    if (
      m &&
      PACKS.some((p) => p[0] === m[1]) &&
      [6, 8, 10, 12, 16, 20, 24].includes(+m[2]) &&
      +m[3] >= 3 &&
      +m[3] <= 12
    )
      return makePack(m[1], +m[2], +m[3]);
    m = key.match(/^r-([a-z]+)-(\d+)-([hv])$/);
    if (m) {
      const mi = MOTIFS.findIndex((x) => x.id === m[1]);
      if (mi >= 0 && [4, 6, 8, 10, 12].includes(+m[2]))
        return makeRoll(mi, +m[2], m[3]);
    }
    throw Error("Unknown puzzle");
  }
  function difficulty(lv) {
    return Math.max(
      10,
      Math.round(
        lv.kind === "man"
          ? lv.tiles.length * lv.fold
          : lv.kind === "roll"
            ? lv.size * lv.size
            : lv.tiles.length * 2,
      ),
    );
  }
  const api = {
    pictureHash,
    PACKS,
    makePack,
    makeRoll,
    puzzleFor,
    puzzleKey,
    difficulty,
    CHAPTERS,
    chapterOf,
    PAL,
    mulberry32,
    build,
    conn,
    tileOk,
    off,
    solved,
    generate,
    isPic,
    picSize,
    makePic,
    isMan,
    FOLDS,
    makeMandala,
  };
  globalThis.Puzzles = api;
  if (typeof module !== "undefined") module.exports = api;
})();
