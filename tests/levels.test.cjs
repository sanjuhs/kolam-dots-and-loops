const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

// Exercise the actual generator without needing a browser or dependencies.
const html = readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ localStorage: { getItem: () => null } });
vm.runInContext(script.split('/* ---------- drawing ---------- */')[0], context);

test('a built kolam is ready for the solved check before scrambling', () => {
  vm.runInContext(`{
    const lv = build({ w: 2, h: 1, shape: 'square', rule: 'all' }, mulberry32(1));
    if (lv.kind !== 'kolam' || lv.tiles.length !== 2 || !solved(lv)) {
      throw new Error('Built kolam is not ready for play');
    }
  }`, context);
});

test('every numbered kolam starts unsolved and can be solved by rotation', () => {
  const checked = vm.runInContext(`(() => {
    let count = 0;
    for (let L = 1; L <= 2000; L++) {
      if (L % 10 === 5 || L % 10 === 8) continue;
      const lv = generate(L);
      if (lv.n !== L || lv.kind !== 'kolam' || lv.tiles.length !== lv.cells.size || solved(lv)) {
        throw new Error('Level ' + L + ' failed to initialize');
      }
      for (const c of lv.tiles) c.rot = 0;
      if (!solved(lv)) throw new Error('Level ' + L + ' cannot be solved');
      count++;
    }
    return count;
  })()`, context, { timeout: 30000 });
  assert.equal(checked, 1600);
});

test('early kolams remain deterministic', () => {
  assert.equal(vm.runInContext(`(() => {
    const snapshot = L => generate(L).tiles.map(c => [c.x, c.y, c.mask, c.rot]);
    return JSON.stringify(snapshot(1)) === JSON.stringify(snapshot(1))
      && JSON.stringify(snapshot(20)) === JSON.stringify(snapshot(20));
  })()`, context), true);
});
