'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../js/nightwatch.js');
const box = { window: {} };
if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), box);
const api = box.window.Nightwatch || {};

test('pointer coordinates respect canvas offset, camera and zoom', () => {
  assert.equal(typeof api.pointerWorld, 'function', 'pointerWorld behavior is missing');
  const p = api.pointerWorld(310, 220, { left: 10, top: 20, width: 600, height: 400 }, { x: 60, y: -40 }, 2);
  assert.equal(p.x, 60); assert.equal(p.y, -40);
  const q = api.pointerWorld(610, 420, { left: 10, top: 20, width: 600, height: 400 }, { x: 60, y: -40 }, 2);
  assert.equal(q.x, 210); assert.equal(q.y, 60);
});

test('three beacon positions are deterministic and outside the spawn area', () => {
  assert.equal(typeof api.createBeacons, 'function', 'beacon creation is missing');
  const a = api.createBeacons(42), b = api.createBeacons(42);
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.equal(a.length, 3);
  a.forEach(x => { assert.ok(Math.hypot(x.x, x.y) >= 300); assert.ok(Math.hypot(x.x, x.y) <= 1000); });
});

test('beacon charges only while inside and grants exactly one completion', () => {
  assert.equal(typeof api.chargeBeacon, 'function', 'beacon charging is missing');
  const b = { x: 0, y: 0, radius: 90, charge: 0, done: false };
  api.chargeBeacon(b, { x: 200, y: 0 }, 1); assert.equal(b.charge, 0);
  for (let i = 0; i < 40; i++) api.chargeBeacon(b, { x: 0, y: 0 }, 0.1);
  const before = b.charge; api.chargeBeacon(b, { x: 200, y: 0 }, 1); assert.equal(b.charge, before);
  let awards = 0;
  for (let i = 0; i < 200; i++) if (api.chargeBeacon(b, { x: 0, y: 0 }, 0.1)) awards++;
  assert.equal(awards, 1); assert.equal(b.charge, 1); assert.equal(b.done, true);
});

test('perfect dodge requires a near miss and only rewards once per dash', () => {
  assert.equal(typeof api.nearMiss, 'function', 'near miss behavior is missing');
  const p = { x: 0, y: 0, r: 15, dashT: 0.15, dodgeRewarded: false, dead: false };
  assert.equal(api.nearMiss(p, { x: 200, y: 0, r: 4 }), false);
  assert.equal(api.nearMiss(p, { x: 30, y: 0, r: 4 }), true);
  assert.equal(api.nearMiss(p, { x: 30, y: 0, r: 4 }), false);
  p.dodgeRewarded = false; p.dashT = 0;
  assert.equal(api.nearMiss(p, { x: 30, y: 0, r: 4 }), false);
});

test('overlapping bullets do not count as precision near misses', () => {
  const p = { x: 0, y: 0, r: 15, dashT: 0.15, dodgeRewarded: false };
  assert.equal(api.nearMiss(p, { x: 0, y: 0, r: 4 }), false);
});

test('relative swept near miss detects a fast crossing between frames', () => {
  const p = { x: 50, y: 0, frameX: 0, frameY: 0, r: 15, dashT: 0.1, dodgeRewarded: false };
  const b = { x: 33.75, y: 48, px: 25, py: 48, r: 4 };
  assert.equal(api.nearMiss(p, b), true);
});

test('pause loadout exposes actual upgrade levels and unmet evolution requirements', () => {
  assert.equal(typeof api.loadout, 'function', 'loadout summary is missing');
  const defs = { rapid: { name: '快速装填', max: 5 }, pierce: { name: '穿甲弹', max: 4 } };
  const evo = { name: '黎明裁决', level: 8, need: { id: 'pierce', lv: 4 } };
  const s = api.loadout({ upgrades: { rapid: 2, pierce: 3 }, evolved: false }, 6, defs, evo);
  assert.equal(s.items.length, 2); assert.equal(s.items[0].id, 'pierce');
  assert.equal(s.evolution.requiredLevel, 8); assert.equal(s.evolution.currentLevel, 6);
  assert.equal(s.evolution.currentUpgrade, 3); assert.equal(s.evolution.ready, false);
  const done = api.loadout({ upgrades: { pierce: 4 }, evolved: false }, 8, defs, evo);
  assert.equal(done.evolution.ready, true);
});
