const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

function runtime() {
  const timers = new Map();
  let timerId = 0;
  class Element {
    constructor() {
      this.children = []; this.dataset = {}; this.attrs = {};
      const classes = new Set();
      this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
        toggle: (c, on) => on ? classes.add(c) : classes.delete(c) };
      this.style = { setProperty() {} };
    }
    set innerHTML(value) { this.children = []; }
    setAttribute(k, v) { this.attrs[k] = v; }
    appendChild(c) { this.children.push(c); }
    addEventListener() {}
    remove() {}
  }
  const elements = new Map();
  const document = { hidden: false, body: new Element(), createElementNS: () => new Element(),
    createElement: () => new Element(), querySelector: () => new Element(), querySelectorAll: () => [],
    getElementById: id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); } };
  class Image {
    constructor() { images.push(this); }
    removeAttribute() { this.src = ''; }
  }
  const images = [];
  class AudioNode {
    constructor() { this.gain = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; this.frequency = {}; }
    connect(node) { return node; }
    disconnect() { this.disconnected = true; }
    start() {}
    stop() {}
  }
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; }
    createOscillator() { return new AudioNode(); }
    createGain() { return new AudioNode(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  const context = vm.createContext({ document, localStorage: { getItem: () => null, setItem() {} },
    history: { replaceState() {} }, location: { pathname: '/' }, Image, AudioContext, AbortController,
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) });
  context.window = context;
  vm.runInContext(readFileSync(`${__dirname}/../motifs.js`, 'utf8'), context);
  vm.runInContext(readFileSync(`${__dirname}/../puzzle-engine.js`, 'utf8'), context);
  const html = readFileSync(`${__dirname}/../index.html`, 'utf8');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1].split('/* ---------- wiring ---------- */')[0], context);
  return { run: code => vm.runInContext(code, context), timers, images };
}

test('changing levels cancels win and hint effects', () => {
  const r = runtime();
  r.run('load(1); hint(); win()');
  assert.equal(r.timers.size, 2);
  r.run('load(2)');
  assert.equal(r.timers.size, 0);
  assert.equal(r.run("board.classList.contains('won') || $('winBox').classList.contains('on')"), false);
});

test('leaving play releases the board and invalidates a pending picture', async () => {
  const r = runtime();
  r.run('load(2000); hint(); loadGallery(0,6)');
  const pending = r.images[0];
  assert.equal(r.timers.size, 1);
  r.run("show('home')");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(r.timers.size, 0);
  assert.equal(pending.onload, null);
  assert.equal(pending.onerror, null);
  assert.equal(pending.src, '');
  assert.equal(r.run('cur === null && board.children.length === 0 && pictureAbort === null'), true);
});

test('picture decode failure clears its timeout and image handlers', async () => {
  const r = runtime();
  const result = r.run("tileSyms('<path/>',3)");
  r.images[0].onerror();
  assert.deepEqual(Array.from(await result), Array(9).fill(4));
  assert.equal(r.timers.size, 0);
  assert.equal(r.images[0].onload, null);
  assert.equal(r.images[0].src, '');
});

test('audio voices are bounded, disconnected on end, and suspended on exit', () => {
  const r = runtime();
  r.run('for(let i=0;i<100;i++)note(7,0,.5,.1)');
  assert.equal(r.run('voices.size'), 24);
  assert.equal(r.run('(()=>{const v=voices.values().next().value;v.o.onended();return v.o.disconnected && v.g.disconnected})()'), true);
  r.run('globalThis.oldVoices=[...voices]; stopAudio()');
  assert.equal(r.run("voices.size === 0 && ac.state === 'suspended' && oldVoices.every(v=>v.o.disconnected&&v.g.disconnected&&v.o.onended===null)"), true);
  r.run('document.hidden=true;note(7,0,.5,.1)');
  assert.equal(r.run('voices.size'), 0);
});
