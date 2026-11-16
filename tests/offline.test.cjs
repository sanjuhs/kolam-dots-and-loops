const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

function worker() {
  const handlers = {}, stores = new Map();
  const root = 'https://kolam.test/game/';
  let offline = false, status = 200;
  const caches = {
    keys: async () => [...stores.keys()], delete: async k => stores.delete(k),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return { addAll: async files => { for (const f of files) entries.set(new URL(f, root).href, new Response('installed')); },
        put: async (key, response) => entries.set(key, response) };
    },
    match: async key => { for (const s of stores.values()) if (s.has(key)) return s.get(key).clone(); }
  };
  const context = vm.createContext({ URL, Response, caches,
    fetch: async () => { if (offline) throw new Error('offline'); return new Response('network', { status }); },
    self: { location: { href: `${root}sw.js` }, addEventListener: (name, fn) => handlers[name] = fn,
      skipWaiting() {}, clients: { claim() {} } } });
  vm.runInContext(readFileSync(`${__dirname}/../sw.js`, 'utf8'), context);
  async function dispatch(name, url) {
    const pending = []; let response;
    handlers[name]({ request: { method: 'GET', url }, waitUntil: p => pending.push(p), respondWith: p => response = p });
    const result = await response; await Promise.all(pending); return result;
  }
  return { stores, dispatch, setOffline: () => offline = true, setStatus: s => status = s, root };
}

test('offline cache stays bounded across query variants and ignores unrelated requests', async () => {
  const w = worker(); await w.dispatch('install');
  for (let i = 0; i < 100; i++) await w.dispatch('fetch', `${w.root}?share=${i}`);
  assert.equal(w.stores.get('kolam-v5').size, 8);
  assert.equal(await w.dispatch('fetch', `${w.root}unrelated.png`), undefined);
  assert.equal(await w.dispatch('fetch', 'https://other.test/index.html'), undefined);
  w.setOffline();
  assert.equal(await (await w.dispatch('fetch', `${w.root}?new-share`)).text(), 'network');
  assert.equal(await (await w.dispatch('fetch', `${w.root}motifs.js`)).text(), 'installed');
});

test('HTTP errors cannot overwrite offline files; activation preserves other apps', async () => {
  const w = worker(); await w.dispatch('install');
  w.setStatus(500); await w.dispatch('fetch', `${w.root}index.html`);
  w.setOffline();
  assert.equal(await (await w.dispatch('fetch', `${w.root}index.html`)).text(), 'installed');
  w.stores.set('kolam-v4', new Map()); w.stores.set('another-app', new Map());
  await w.dispatch('activate');
  assert.deepEqual([...w.stores.keys()], ['kolam-v5', 'another-app']);
});
