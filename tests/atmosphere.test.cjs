'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scriptPath = path.join(__dirname, '..', 'js', 'atmosphere.js');

function loadAtmosphere() {
  const sandbox = { window: {} };
  if (fs.existsSync(scriptPath)) {
    vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), sandbox, { filename: scriptPath });
  }
  assert.equal(typeof sandbox.window.Atmosphere, 'object', 'classic script must expose window.Atmosphere');
  return sandbox.window.Atmosphere;
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

// Fake only the browser boundary: reject non-finite geometry and record draw calls/styles.
function fakeCanvas() {
  const calls = [];
  const stack = [];
  const ctx = { globalAlpha: 0.63, globalCompositeOperation: 'source-over', lineWidth: 3,
    fillStyle: '#123', strokeStyle: '#456', lineCap: 'butt', lineJoin: 'miter',
    shadowBlur: 0, shadowColor: 'transparent' };
  const styleKeys = Object.keys(ctx);
  for (const name of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo',
    'arc', 'ellipse', 'rect', 'fillRect', 'strokeRect', 'translate', 'rotate', 'scale', 'clip', 'fill', 'stroke', 'setLineDash']) {
    ctx[name] = (...args) => {
      for (const arg of args.flat()) {
        if (typeof arg === 'number') assert.ok(Number.isFinite(arg), name + ' received non-finite geometry');
      }
      if (name === 'arc') assert.ok(args[2] >= 0, 'arc radius must be non-negative');
      if (name === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0, 'ellipse radii must be non-negative');
      calls.push({ name, args, alpha: ctx.globalAlpha, fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, composite: ctx.globalCompositeOperation });
    };
  }
  for (const name of ['createRadialGradient', 'createLinearGradient']) {
    ctx[name] = (...args) => {
      assert.ok(args.every(Number.isFinite));
      const gradient = { stops: [], addColorStop(offset, color) {
        assert.ok(offset >= 0 && offset <= 1);
        gradient.stops.push([offset, color]);
      } };
      calls.push({ name, args, gradient });
      return gradient;
    };
  }
  ctx.save = () => stack.push(Object.fromEntries(styleKeys.map(key => [key, ctx[key]])));
  ctx.restore = () => {
    assert.ok(stack.length, 'unbalanced Canvas restore');
    Object.assign(ctx, stack.pop());
  };
  return { ctx, calls, stack, styles: () => Object.fromEntries(styleKeys.map(key => [key, ctx[key]])) };
}

test('create produces deterministic, bounded rain and ripple pools without DOM dependencies', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(408);
  const same = atmosphere.create(408);
  const other = atmosphere.create(409);
  assert.deepEqual(snapshot(scene), snapshot(same));
  assert.notDeepEqual(snapshot(scene.rain), snapshot(other.rain));
  const budget = atmosphere.budget(scene);
  assert.ok(scene.rain.length > 0 && scene.rain.length <= budget.limits.rain);
  assert.ok(scene.ripples.length > 0 && scene.ripples.length <= budget.limits.ripples);
  assert.ok(scene.puddles.length > 0 && scene.puddles.length <= budget.limits.puddles);
  assert.equal(budget.rain, scene.rain.length);
  assert.equal(budget.ripples, scene.ripples.length);
  assert.equal(budget.puddles, scene.puddles.length);
  assert.ok(budget.limits.rain <= 160, 'overlay must stay modest');
  assert.ok(budget.limits.ripples <= 64, 'no unbounded splash allocation');
});

test('update clamps elapsed time, advances diagonal rain and reuses its pools over long sessions', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(17);
  const clamped = atmosphere.create(17);
  const arrays = { rain: scene.rain, ripples: scene.ripples, puddles: scene.puddles };
  const before = snapshot(scene.rain);
  const options = { width: 960, height: 540 };
  atmosphere.update(scene, 60, options);
  atmosphere.update(clamped, atmosphere.budget(scene).limits.maxDt, options);
  assert.deepEqual(snapshot(scene), snapshot(clamped), 'resuming a background tab must not cause a particle leap');
  assert.notDeepEqual(snapshot(scene.rain), before);
  assert.ok(scene.rain[0].x > before[0].x || scene.rain[0].x < 0.05);
  for (let i = 0; i < 12000; i++) {
    atmosphere.update(scene, 1 / 60, { low: i % 2 === 0, width: i % 3 ? 375 : 1920, height: 812 });
  }
  assert.equal(scene.rain, arrays.rain);
  assert.equal(scene.ripples, arrays.ripples);
  assert.equal(scene.puddles, arrays.puddles);
  const budget = atmosphere.budget(scene);
  assert.equal(scene.rain.length, budget.limits.rain);
  assert.equal(scene.ripples.length, budget.limits.ripples);
  assert.equal(scene.puddles.length, budget.limits.puddles);
  for (const drop of scene.rain) {
    assert.ok(drop.x >= 0 && drop.x < 1 && drop.y >= 0 && drop.y < 1);
  }
  for (const ripple of scene.ripples) {
    assert.ok(ripple.age >= 0 && ripple.age < ripple.life);
    assert.ok(ripple.puddle >= 0 && ripple.puddle < scene.puddles.length);
  }
});

test('reduceMotion freezes rain, ripples and atmospheric time regardless of viewport or quality changes', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(408);
  const before = snapshot(scene);
  for (let i = 0; i < 60; i++) {
    atmosphere.update(scene, 1, { reduceMotion: true, low: i % 2 === 0, width: 360 + i, height: 720 });
  }
  assert.deepEqual(snapshot(scene), before);
});

test('update ignores invalid elapsed time and handles missing or zero viewport dimensions', () => {
  const atmosphere = loadAtmosphere();
  for (const dt of [0, -1, NaN, Infinity, undefined]) {
    const scene = atmosphere.create(8);
    const before = snapshot(scene);
    atmosphere.update(scene, dt);
    assert.deepEqual(snapshot(scene), before);
  }
  const scene = atmosphere.create(8);
  atmosphere.update(scene, 0.016, { width: 0, height: NaN });
  assert.ok(scene.rain.every(drop => Number.isFinite(drop.x) && Number.isFinite(drop.y)));
});

test('drawWeather is a subtle screen-space rain overlay and restores the caller Canvas state', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(20);
  const canvas = fakeCanvas();
  const before = canvas.styles();
  const stateBefore = snapshot(scene);
  atmosphere.drawWeather(canvas.ctx, scene, { width: 960, height: 540, time: 10 });
  const lines = canvas.calls.filter(call => call.name === 'lineTo');
  assert.equal(lines.length, scene.rain.length);
  const moves = canvas.calls.filter(call => call.name === 'moveTo');
  assert.equal(moves[0].args[0], scene.rain[0].x * 960);
  assert.equal(moves[0].args[1], scene.rain[0].y * 540);
  assert.ok(lines[0].args[0] > moves[0].args[0] && lines[0].args[1] > moves[0].args[1]);
  const strokes = canvas.calls.filter(call => call.name === 'stroke');
  assert.ok(strokes.every(call => call.alpha <= 0.14 && call.lineWidth <= 1), 'rain must not obscure enemies');
  assert.equal(canvas.calls.filter(call => call.name === 'fillRect').length, 0, 'no full-screen opaque tint');
  assert.equal(canvas.calls.filter(call => ['translate', 'scale', 'rotate'].includes(call.name)).length, 0);
  assert.deepEqual(canvas.styles(), before);
  assert.equal(canvas.stack.length, 0);
  assert.deepEqual(snapshot(scene), stateBefore, 'drawing must not mutate simulation');
});

test('low weather reduces draw work and reduced motion suppresses rain altogether', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(20);
  const low = fakeCanvas();
  atmosphere.drawWeather(low.ctx, scene, { width: 375, height: 812, low: true });
  assert.equal(low.calls.filter(call => call.name === 'lineTo').length, atmosphere.budget(scene).limits.lowRain);
  for (const lowQuality of [false, true]) {
    const still = fakeCanvas();
    atmosphere.drawWeather(still.ctx, scene, { width: 375, height: 812, low: lowQuality, reduceMotion: true, time: 400 });
    assert.equal(still.calls.length, 0, 'reduced-motion rain should not be replaced with moving mist');
  }
});

test('puddles cover the circular arena and draw wet silhouettes, reflections and ripple ellipses in world space', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(77);
  const quadrants = new Set(scene.puddles.map(p => (p.x >= 0 ? 'e' : 'w') + (p.y >= 0 ? 's' : 'n')));
  assert.equal(quadrants.size, 4);
  assert.ok(scene.puddles.some(p => Math.hypot(p.x, p.y) > 1200));
  assert.ok(scene.puddles.some(p => Math.hypot(p.x, p.y) < 250));
  assert.ok(scene.puddles.every(p => Math.hypot(p.x, p.y) + p.rx < 1500));
  const canvas = fakeCanvas();
  const before = canvas.styles();
  const stateBefore = snapshot(scene);
  atmosphere.drawPuddles(canvas.ctx, scene, { cameraX: 0, cameraY: 0, width: 3200, height: 3200, zoom: 1, time: 10 });
  assert.ok(canvas.calls.filter(c => c.name === 'quadraticCurveTo').length >= scene.puddles.length * 8,
    'water should have irregular curved shorelines, not just uniform circles');
  assert.ok(canvas.calls.some(c => c.name === 'createLinearGradient'), 'wet moon reflections');
  assert.ok(canvas.calls.filter(c => c.name === 'ellipse').length >= scene.ripples.length, 'raindrop ripple rings');
  const translations = canvas.calls.filter(c => c.name === 'translate');
  assert.deepEqual(translations[0].args, [scene.puddles[0].x, scene.puddles[0].y]);
  assert.equal(canvas.calls.filter(c => c.name === 'scale').length, 0, 'caller already applied world zoom');
  assert.equal(canvas.stack.length, 0);
  assert.deepEqual(canvas.styles(), before);
  assert.deepEqual(snapshot(scene), stateBefore);
});

test('puddle viewport culling uses camera and zoom without moving world coordinates', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(77);
  const target = scene.puddles[0];
  const visible = fakeCanvas();
  atmosphere.drawPuddles(visible.ctx, scene, { cameraX: target.x, cameraY: target.y, width: 2, height: 2, zoom: 2 });
  assert.ok(visible.calls.some(c => c.name === 'translate' && c.args[0] === target.x && c.args[1] === target.y));
  assert.ok(visible.calls.filter(c => c.name === 'translate').length < scene.puddles.length);
  const outside = fakeCanvas();
  atmosphere.drawPuddles(outside.ctx, scene, { cameraX: 10000, cameraY: 10000, width: 960, height: 540, zoom: 2 });
  assert.equal(outside.calls.length, 0, 'off-screen ground should not consume draw work');
});

test('low puddles omit costly gradients and reduced-motion puddles stay identical at different times', () => {
  const atmosphere = loadAtmosphere();
  const scene = atmosphere.create(77);
  const options = { cameraX: 0, cameraY: 0, width: 3200, height: 3200, zoom: 1 };
  const full = fakeCanvas(), low = fakeCanvas();
  atmosphere.drawPuddles(full.ctx, scene, options);
  atmosphere.drawPuddles(low.ctx, scene, { ...options, low: true });
  assert.equal(low.calls.filter(c => c.name.startsWith('create')).length, 0);
  assert.ok(low.calls.length < full.calls.length);
  assert.ok(low.calls.some(c => c.name === 'fill'), 'low mode still has wet ground');
  const stillA = fakeCanvas(), stillB = fakeCanvas();
  atmosphere.drawPuddles(stillA.ctx, scene, { ...options, reduceMotion: true, time: 1 });
  atmosphere.drawPuddles(stillB.ctx, scene, { ...options, reduceMotion: true, time: 120 });
  assert.deepEqual(snapshot(stillA.calls), snapshot(stillB.calls));
  assert.equal(stillA.calls.filter(c => c.name === 'ellipse').length, 0, 'no expanding ripple rings in reduced motion');
});

test('beaconVisible culls only when the entire 200-unit light envelope is outside the viewport', () => {
  const atmosphere = loadAtmosphere();
  const options = { cameraX: 0, cameraY: 0, width: 960, height: 540, zoom: 1 };
  assert.equal(atmosphere.beaconVisible({ x: 0, y: 0, radius: 90 }, options), true);
  assert.equal(atmosphere.beaconVisible({ x: 679, y: 0, radius: 90 }, options), true, 'right-edge halo remains visible');
  assert.equal(atmosphere.beaconVisible({ x: 680, y: 0, radius: 90 }, options), true, 'tangent halo is conservatively retained');
  assert.equal(atmosphere.beaconVisible({ x: 681, y: 0, radius: 90 }, options), false);
  assert.equal(atmosphere.beaconVisible({ x: -681, y: 0, radius: 90 }, options), false);
  assert.equal(atmosphere.beaconVisible({ x: 0, y: 469, radius: 90 }, options), true, 'bottom-edge halo remains visible');
  assert.equal(atmosphere.beaconVisible({ x: 0, y: 471, radius: 90 }, options), false);
  assert.equal(atmosphere.beaconVisible({ x: 0, y: -471, radius: 90 }, options), false);
  assert.equal(atmosphere.beaconVisible({ x: 600, y: 390, radius: 90 }, options), true, 'diagonal halo touches the corner');
  assert.equal(atmosphere.beaconVisible({ x: 650, y: 440, radius: 90 }, options), false, 'disjoint corner halo is culled');
});

test('beaconVisible uses camera-relative world bounds and divides viewport dimensions by zoom', () => {
  const atmosphere = loadAtmosphere();
  const options = { cameraX: 1200, cameraY: -800, width: 960, height: 540, zoom: 2 };
  const beacon = { x: 1639, y: -800, radius: 90, charge: 1, done: true };
  const before = snapshot({ beacon, options });
  assert.equal(atmosphere.beaconVisible(beacon, options), true, 'completed beacon still has visible warm light');
  assert.equal(atmosphere.beaconVisible({ ...beacon, x: 1641 }, options), false);
  assert.equal(atmosphere.beaconVisible({ ...beacon, x: 1200, y: -466 }, options), true);
  assert.equal(atmosphere.beaconVisible({ ...beacon, x: 1200, y: -464 }, options), false);
  assert.deepEqual(snapshot({ beacon, options }), before, 'visibility test must be pure');
});

test('beaconVisible tolerates missing options and invalid viewport values using renderer defaults', () => {
  const atmosphere = loadAtmosphere();
  assert.equal(atmosphere.beaconVisible({ x: 0, y: 0 }), true);
  assert.equal(atmosphere.beaconVisible({ x: 10000, y: 0 }), false);
  assert.equal(atmosphere.beaconVisible({ x: 681, y: 0 }, { width: NaN, height: 0, zoom: -1, cameraX: Infinity, cameraY: NaN }), false);
  assert.equal(atmosphere.beaconVisible({}), true);
});

test('beacon draws a world-space lantern structure, local warm glow and accurate charge ring', () => {
  const atmosphere = loadAtmosphere();
  const canvas = fakeCanvas();
  const before = canvas.styles();
  const beacon = { x: 240, y: -120, radius: 90, charge: 0.25, done: false };
  const stateBefore = snapshot(beacon);
  atmosphere.drawBeacon(canvas.ctx, beacon, 12, false);
  assert.deepEqual(canvas.calls.find(c => c.name === 'translate').args, [beacon.x, beacon.y]);
  assert.ok(canvas.calls.filter(c => c.name === 'createRadialGradient').length >= 2, 'ground pool and flame halo');
  assert.ok(canvas.calls.filter(c => c.name === 'lineTo').length >= 12, 'substantive ironwork / roof / frame');
  assert.ok(canvas.calls.some(c => c.name === 'fillRect'), 'glass chamber and pedestal');
  const charge = canvas.calls.find(c => c.name === 'arc' && c.args[2] === 90 && Math.abs(c.args[4] - c.args[3] - Math.PI / 2) < 1e-9);
  assert.ok(charge, '25% charged must draw a quarter-turn ring');
  assert.equal(canvas.stack.length, 0);
  assert.deepEqual(canvas.styles(), before);
  assert.deepEqual(snapshot(beacon), stateBefore, 'beacon drawing must not alter game objective');
});

test('beacon charge is clamped and invalid or omitted drawing inputs stay finite', () => {
  const atmosphere = loadAtmosphere();
  const zero = fakeCanvas(), negative = fakeCanvas(), full = fakeCanvas(), excessive = fakeCanvas();
  atmosphere.drawBeacon(zero.ctx, { x: 0, y: 0, radius: 90, charge: 0 }, 0, true);
  atmosphere.drawBeacon(negative.ctx, { x: 0, y: 0, radius: 90, charge: -5 }, 0, true);
  atmosphere.drawBeacon(full.ctx, { x: 0, y: 0, radius: 90, charge: 1 }, 0, true);
  atmosphere.drawBeacon(excessive.ctx, { x: 0, y: 0, radius: 90, charge: 5 }, 0, true);
  assert.deepEqual(snapshot(zero.calls), snapshot(negative.calls));
  assert.deepEqual(snapshot(full.calls), snapshot(excessive.calls));
  assert.doesNotThrow(() => atmosphere.drawBeacon(fakeCanvas().ctx, { x: NaN, y: Infinity, radius: -1, charge: NaN }, NaN));
  assert.doesNotThrow(() => atmosphere.drawBeacon(fakeCanvas().ctx, {}));
  assert.doesNotThrow(() => atmosphere.drawPuddles(fakeCanvas().ctx, atmosphere.create(4)));
  assert.doesNotThrow(() => atmosphere.drawWeather(fakeCanvas().ctx, atmosphere.create(4)));
});

test('active beacon flickers gently while reduced-motion rendering is time-independent', () => {
  const atmosphere = loadAtmosphere();
  const beacon = { x: 30, y: 40, radius: 90, charge: 0.6, done: false };
  const activeA = fakeCanvas(), activeB = fakeCanvas(), stillA = fakeCanvas(), stillB = fakeCanvas();
  atmosphere.drawBeacon(activeA.ctx, beacon, 0, false);
  atmosphere.drawBeacon(activeB.ctx, beacon, 2, false);
  assert.notDeepEqual(snapshot(activeA.calls), snapshot(activeB.calls));
  atmosphere.drawBeacon(stillA.ctx, beacon, 0, true);
  atmosphere.drawBeacon(stillB.ctx, beacon, 300, true);
  assert.deepEqual(snapshot(stillA.calls), snapshot(stillB.calls));
});

test('completed beacon remains lit with steady warm light, no charging and identical reduced-motion rendering', () => {
  const atmosphere = loadAtmosphere();
  const beacon = { x: 30, y: 40, radius: 90, charge: 1, done: true };
  const doneA = fakeCanvas(), doneB = fakeCanvas(), still = fakeCanvas(), active = fakeCanvas();
  atmosphere.drawBeacon(doneA.ctx, beacon, 0, false);
  atmosphere.drawBeacon(doneB.ctx, beacon, 300, false);
  atmosphere.drawBeacon(still.ctx, beacon, 300, true);
  atmosphere.drawBeacon(active.ctx, { ...beacon, done: false }, 0, false);
  const glows = doneA.calls.filter(c => c.name === 'createRadialGradient');
  assert.equal(glows.length, 2, 'lit completion must retain the warm ground pool and lantern halo');
  assert.ok(glows[0].gradient.stops.some(([, color]) => color === 'rgba(245,163,66,0.25)'), 'completed ground light stays amber');
  assert.ok(doneA.calls.some(c => c.name === 'fill' && c.fillStyle === '#fff0be'), 'completed lantern keeps its warm flame core');
  assert.deepEqual(snapshot(doneA.calls), snapshot(doneB.calls), 'completed lantern must not flicker or sway');
  assert.deepEqual(snapshot(doneA.calls), snapshot(still.calls), 'completion must look identical with reduced motion');
  assert.equal(doneA.calls.filter(c => c.name === 'arc' && c.args[2] === 90).length, 0, 'completed beacon must stop asking for activation');
  assert.notDeepEqual(snapshot(doneA.calls), snapshot(active.calls), 'done state must be visually distinct');
});
