'use strict';
// Actual classic scripts driven without a browser. Preview QA remains a separate requirement.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function boot() {
  const gradients = () => ({ addColorStop() {} });
  const context = new Proxy({ createRadialGradient: gradients, createLinearGradient: gradients,
    createPattern: () => ({}), measureText: () => ({ width: 40 }),
    getImageData: () => ({ data: new Uint8ClampedArray(512 * 512 * 4) }) },
  { get: (o, k) => k in o ? o[k] : () => {} });
  const events = {}, nodes = {}, timers = [];
  function node(id = '') {
    const classes = new Set(['hidden']);
    const n = { id, dataset: {}, style: { setProperty() {} }, children: [], textContent: '',
      classList: { add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)),
        contains: c => classes.has(c), toggle: (c, on) => { const yes = on === undefined ? !classes.has(c) : on; yes ? classes.add(c) : classes.delete(c); return yes; } },
      setAttribute() {}, addEventListener(type, fn) { this['on' + type] = fn; },
      appendChild(c) { this.children.push(c); c.parentNode = this; }, removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
      querySelectorAll() { return []; }, getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 }) };
    n.click = () => { if (n.onclick) n.onclick({}); };
    return n;
  }
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) nodes[match[1]] = node(match[1]);
  const document = { readyState: 'complete', body: node('body'), hidden: false,
    getElementById: id => nodes[id] || null, createElement: () => node(),
    querySelectorAll: () => [], addEventListener: (e, fn) => { events['document:' + e] = fn; } };
  const window = { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }), addEventListener: (e, fn) => { (events[e] ||= []).push(fn); } };
  const storage = new Map();
  const box = { window, document, console, performance, location: { search: '' },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    requestAnimationFrame() {}, setTimeout: fn => { timers.push(fn); }, setInterval() {}, clearInterval() {},
    Uint8ClampedArray, Path2D: function () {} };
  vm.createContext(box);
  for (const file of ['art', 'audio', 'upgrades', 'nightwatch', 'atmosphere']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/' + file + '.js'), 'utf8'), box);
    box[file === 'audio' ? 'AudioFX' : file.charAt(0).toUpperCase() + file.slice(1)] = window[file === 'audio' ? 'AudioFX' : file.charAt(0).toUpperCase() + file.slice(1)];
  }
  const audioCalls = [];
  for (const name of ['shot', 'footstep', 'beacon', 'perfectDodge', 'setPaused']) {
    const original = box.AudioFX[name];
    box.AudioFX[name] = (...args) => { audioCalls.push({ name, args }); return original(...args); };
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), box);
  const key = (code, up = false) => (events[up ? 'keyup' : 'keydown'] || []).forEach(fn => fn({ code, preventDefault() {}, repeat: false }));
  return { api: window.__game, nodes, key, storage, audioCalls };
}

test('offline entrypoint references only bundled scripts and styles that exist', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.includes('js/nightwatch.js')); assert.ok(refs.includes('js/atmosphere.js'));
  for (const ref of refs) {
    assert.equal(/^(?:https?:)?\/\//.test(ref), false, 'runtime remote dependency: ' + ref);
    if (!ref.startsWith('#') && !ref.startsWith('data:')) assert.ok(fs.existsSync(path.join(root, ref)), 'missing asset: ' + ref);
  }
});

test('actual game starts, moves, auto shoots, presents upgrades and advances beyond 40 seconds', () => {
  const { api, key, nodes, audioCalls } = boot();
  assert.equal(api.state, 'menu'); api.start('quick', 'pistol');
  key('KeyD'); api.step(1 / 60, 60); key('KeyD', true); assert.ok(api.g.player.x > 100);
  api.spawn('ghoul', 10); api.step(1 / 60, 120); assert.ok(api.g.stats.shots > 0);
  assert.ok(audioCalls.some(c => c.name === 'footstep'));
  assert.ok(audioCalls.some(c => c.name === 'shot' && c.args[1] === 'pistol'));
  api.levelUp(); assert.equal(api.state, 'levelup'); assert.equal(api.g.offers.length, 3);
  key('Digit1'); assert.equal(api.state, 'playing');
  api.g.player.invuln = 999; api.g.player.regen = 20;
  for (let i = 0; i < 2500; i++) { if (api.state === 'levelup') key('Digit1'); api.step(1 / 60, 1); }
  assert.ok(api.g.t > 40); assert.ok(Number.isFinite(api.g.player.hp));
  assert.ok(nodes['hud-objective'].textContent.includes('灯塔'));
});

test('all four modes and all three weapons run with quality and motion fallbacks', () => {
  const { api } = boot();
  for (const mode of ['standard', 'quick', 'nightmare', 'daily']) {
    for (const weapon of ['pistol', 'shotgun', 'repeater']) {
      api.start(mode, weapon); api.setSetting('quality', 'low'); api.setSetting('reduceMotion', true);
      api.spawn('ghoul', 5); api.step(1 / 60, 180);
      assert.equal(api.g.weapon, weapon); assert.equal(api.g.beacons.length, 3);
      assert.ok(api.g.stats.shots > 0); assert.ok(api.g.player.hp > 0);
      api.setSetting('quality', 'high'); api.setSetting('reduceMotion', false); api.renderOnce();
    }
  }
});

test('touch input never enables directed aim and cancelled aim does not persist across a new run', () => {
  const { api, nodes, key } = boot(); api.start('quick');
  nodes.game.onpointerdown({ pointerType: 'touch', button: 0, clientX: 900, clientY: 400, pointerId: 1 });
  api.step(1 / 60, 1); api.hud(); assert.equal(nodes['hud-aim'].textContent, '自动瞄准');
  nodes.game.onpointerdown({ pointerType: 'mouse', button: 0, clientX: 900, clientY: 400, pointerId: 2 });
  key('Escape'); nodes['btn-resume'].click(); api.step(1 / 60, 1); api.hud();
  assert.equal(nodes['hud-aim'].textContent, '自动瞄准');
  nodes.game.onpointerdown({ pointerType: 'mouse', button: 0, clientX: 900, clientY: 400, pointerId: 3 });
  api.start('quick'); api.hud(); assert.equal(nodes['hud-aim'].textContent, '自动瞄准');
});

test('actual pointer input overrides automatic aim and release restores automatic targeting', () => {
  const { api, nodes } = boot(); api.start('quick', 'repeater');
  nodes.game.onpointerdown({ pointerType: 'mouse', button: 0, clientX: 900, clientY: 400, pointerId: 1 });
  api.step(1 / 60, 20); assert.equal(api.g.player.aim, 0); assert.ok(api.g.stats.shots > 0);
  api.hud(); assert.equal(nodes['hud-aim'].textContent, '定向瞄准');
  nodes.game.onpointercancel({ pointerId: 1 }); api.step(1 / 60, 1); api.hud();
  assert.equal(nodes['hud-aim'].textContent, '自动瞄准');
});

test('actual beacon reward is applied once and pause exposes loadout without progressing time', () => {
  const { api, nodes, key, audioCalls } = boot(); api.start('quick');
  const b = api.g.beacons[0]; api.g.player.x = b.x; api.g.player.y = b.y;
  api.g.spawnTimer = 999; api.g.player.hp = 50;
  api.step(1 / 60, 500); assert.equal(b.done, true); assert.ok(api.g.player.hp > 70);
  assert.equal(audioCalls.filter(c => c.name === 'beacon').length, 1);
  const xp = api.g.xp; api.step(1 / 60, 60); assert.equal(api.g.xp, xp);
  api.give('pierce'); key('Escape'); assert.equal(api.state, 'paused');
  assert.equal(audioCalls.filter(c => c.name === 'setPaused').at(-1).args[0], true);
  assert.ok(nodes['pause-build'].innerHTML.includes('穿甲弹')); assert.ok(nodes['pause-evolution'].textContent.includes('黎明裁决'));
  const t = api.g.t; api.step(1 / 60, 60); assert.equal(api.g.t, t);
  nodes['btn-resume'].click(); assert.equal(api.state, 'playing');
});

test('beacon completed at the rim directly grants its shield reward', () => {
  const { api } = boot(); api.start('quick'); const b = api.g.beacons[0];
  api.g.player.x = b.x + 80; api.g.player.y = b.y; api.g.spawnTimer = 999;
  api.step(1/60, 490); assert.equal(b.done, true); assert.equal(api.g.player.shieldCharges, 1);
});

test('unrelated touch pointer cannot move or release a held mouse aim', () => {
  const { api, nodes } = boot(); api.start('quick');
  nodes.game.onpointerdown({ pointerType: 'mouse', button: 0, clientX: 900, clientY: 400, pointerId: 2 });
  nodes.game.onpointermove({ pointerType: 'touch', clientX: 100, clientY: 50, pointerId: 3 });
  nodes.game.onpointercancel({ pointerId: 3 }); api.step(1/60, 1); api.hud();
  assert.equal(nodes['hud-aim'].textContent, '定向瞄准'); assert.equal(api.g.player.aim, 0);
});

test('cancelled joystick gestures cannot reactivate movement after pause or upgrade', () => {
  const { api, nodes, key } = boot(); api.start('quick');
  nodes['joy-base'].onpointerdown({ pointerId: 10, clientX: 800, clientY: 400, preventDefault() {} });
  key('Escape');
  nodes['joy-base'].onpointermove({ pointerId: 10, clientX: 800, clientY: 400, preventDefault() {} });
  nodes['btn-resume'].click(); api.g.player.vx = 0; api.g.player.vy = 0;
  const x = api.g.player.x; api.step(1/60, 30); assert.equal(api.g.player.x, x);
  nodes['joy-base'].onpointerdown({ pointerId: 11, clientX: 800, clientY: 400, preventDefault() {} });
  api.levelUp(); nodes['joy-base'].onpointermove({ pointerId: 11, clientX: 800, clientY: 400, preventDefault() {} });
  key('Digit1'); api.g.player.vx = 0; api.g.player.vy = 0;
  const y = api.g.player.y; api.step(1/60, 30); assert.equal(api.g.player.y, y);
});

test('daily beacon layout and upgrade offers repeat independently of weather rendering', () => {
  const { api, key } = boot();
  api.start('daily', 'pistol'); const positions = JSON.stringify(api.g.beacons);
  api.levelUp(); const offers = api.g.offers.map(o => o.id).join(','); key('Digit1');
  api.step(1 / 60, 20); api.start('daily', 'pistol');
  assert.equal(JSON.stringify(api.g.beacons), positions);
  api.levelUp(); assert.equal(api.g.offers.map(o => o.id).join(','), offers);
});

test('actual dodge rewards once, Boss appears, and both endings record new local statistics', () => {
  const { api, key, nodes, storage, audioCalls } = boot(); api.start('quick');
  key('Space'); api.g.ebullets.push({ x: 25, y: 35, vx: 0, vy: 0, r: 4, damage: 10, life: 5 });
  api.step(1 / 60, 1); assert.equal(api.g.stats.perfectDodges, 1); assert.ok(api.g.player.focusT > 0);
  assert.equal(audioCalls.filter(c => c.name === 'perfectDodge').length, 1);
  api.step(1 / 60, 3); assert.equal(api.g.stats.perfectDodges, 1);
  api.spawnBoss(); api.step(1 / 60, 200); assert.ok(api.g.boss);
  api.win(); api.step(1 / 60, 300); assert.equal(api.state, 'over');
  assert.ok(nodes['end-watch'].textContent.includes('精准闪避 1'));
  assert.equal(JSON.parse(storage.get('lastlight.meta')).history[0].perfectDodges, 1);
  api.start('quick', 'shotgun'); api.hurt(99999); api.step(1 / 60, 300); assert.equal(api.state, 'over');
  assert.equal(api.g.endWin, false);
});
