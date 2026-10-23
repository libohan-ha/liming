'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scriptPath = path.join(__dirname, '..', 'js', 'character.js');
const json = value => JSON.parse(JSON.stringify(value));

// Browser boundary recorder. Tracks real affine transforms and rejects non-finite draws.
function recorder(canvas = null) {
  const calls = [], stack = [];
  const keys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth',
    'lineCap', 'lineJoin', 'shadowBlur', 'shadowColor', 'imageSmoothingEnabled', 'filter'];
  const ctx = { canvas, globalAlpha: 0.67, globalCompositeOperation: 'source-over',
    fillStyle: '#135', strokeStyle: '#246', lineWidth: 2, lineCap: 'butt', lineJoin: 'miter',
    shadowBlur: 0, shadowColor: 'transparent', imageSmoothingEnabled: false, filter: 'none' };
  let matrix = [1, 0, 0, 1, 0, 0];
  const mul = n => { const [a,b,c,d,e,f] = matrix, [g,h,i,j,k,l] = n;
    matrix = [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f]; };
  const styles = () => Object.fromEntries(keys.map(k => [k, ctx[k]]));
  for (const name of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo',
    'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'fillRect', 'strokeRect', 'clearRect',
    'fill', 'stroke', 'clip', 'translate', 'rotate', 'scale', 'setTransform', 'drawImage']) {
    ctx[name] = (...args) => {
      for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), name + ' needs finite geometry');
      if (name === 'translate') mul([1,0,0,1,args[0],args[1]]);
      if (name === 'rotate') { const s = Math.sin(args[0]), c = Math.cos(args[0]); mul([c,s,-s,c,0,0]); }
      if (name === 'scale') mul([args[0],0,0,args[1],0,0]);
      if (name === 'setTransform') matrix = args.slice();
      if (name === 'arc') assert.ok(args[2] >= 0);
      if (name === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0);
      assert.ok(ctx.globalAlpha >= 0 && ctx.globalAlpha <= 1, 'alpha in [0,1]');
      calls.push({ name, args, matrix: matrix.slice(), ...styles() });
    };
  }
  for (const name of ['createLinearGradient', 'createRadialGradient']) ctx[name] = (...args) => {
    assert.ok(args.every(Number.isFinite));
    const gradient = { stops: [], addColorStop(n, color) { assert.ok(n >= 0 && n <= 1); this.stops.push([n, color]); } };
    calls.push({ name, args, gradient }); return gradient;
  };
  ctx.save = () => stack.push({ styles: styles(), matrix: matrix.slice() });
  ctx.restore = () => { assert.ok(stack.length, 'restore must have save'); const old = stack.pop(); Object.assign(ctx, old.styles); matrix = old.matrix; };
  return { ctx, calls, stack, styles, matrix: () => matrix.slice() };
}
function load() {
  const canvases = [];
  const document = { createElement(tag) {
    assert.equal(tag, 'canvas', 'only local canvases are allowed');
    const canvas = { width: 0, height: 0, id: canvases.length };
    canvas.record = recorder(canvas); canvas.record.ctx.globalAlpha = 1;
    canvas.getContext = kind => { assert.equal(kind, '2d'); return canvas.record.ctx; };
    canvases.push(canvas); return canvas;
  } };
  const sandbox = { window: {}, document };
  if (fs.existsSync(scriptPath)) vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), sandbox, { filename: scriptPath });
  assert.equal(typeof sandbox.window.Character, 'object', 'classic script must expose window.Character');
  return { character: sandbox.window.Character, canvases };
}
const player = extras => ({ x: 71, y: -32, vx: 180, vy: 40, aim: 0.4, walkPhase: 1.4,
  weapon: 'pistol', evolved: false, recoil: 0.7, muzzle: 0.02, hurtFlash: 0, dashT: 0, ...extras });
const sprites = record => record.calls.filter(c => c.name === 'drawImage');
const signature = calls => calls.map(c => ({ name: c.name, args: c.args.map(a => typeof a === 'object' && a && 'id' in a ? 'canvas' : a), matrix: c.matrix }));
function assertPartDrawsInsideAtlas(calls, assets) {
  for (const c of calls) {
    assert.equal(c.args.length, 9, 'sprite draw must select a bounded atlas rectangle');
    const [src,sx,sy,sw,sh,,,dw,dh] = c.args;
    assert.ok(src === assets.canvas || src === assets.mask);
    assert.ok(sx >= 0 && sy >= 0 && sx + sw <= src.width && sy + sh <= src.height);
    assert.ok(sw > 0 && sh > 0 && dw > 0 && dh > 0);
  }
}

test('classic Character exports only a local cached rendering and immutable pose API', () => {
  const { character: c, canvases } = load();
  for (const name of ['init', 'pose', 'capture', 'draw', 'drawGhost']) assert.equal(typeof c[name], 'function', name);
  assert.equal(canvases.length, 0, 'loading the script does not allocate before Art.init');
});

test('init caches detailed parts once at 3x inside a bounded atlas with an exact alpha-mask twin', () => {
  const { character: c, canvases } = load();
  const a = c.init();
  assert.equal(c.init(), a);
  assert.equal(c.assets, a);
  assert.equal(a.scale, 3);
  assert.equal(canvases.length, 2, 'one color atlas and one alpha-mask atlas, no per-frame sprites');
  assert.equal(a.canvas.width, a.width * 3); assert.equal(a.canvas.height, a.height * 3);
  assert.equal(a.mask.width, a.canvas.width); assert.equal(a.mask.height, a.canvas.height);
  assert.ok(a.bytes <= 8 * 1024 * 1024, 'combined backing stores stay below 8 MiB');
  assert.equal(a.bytes, a.width * a.height * 9 * 4 * 2);
  assert.ok(Object.keys(a.parts).length >= 24, 'head, panels, articulated boots, cape, gloves and weapons are separate art');
  for (const part of Object.values(a.parts)) {
    assert.ok(part.x >= 0 && part.y >= 0 && part.x + part.w <= a.width && part.y + part.h <= a.height);
    assert.ok(Object.isFrozen(part));
  }
  assert.ok(a.canvas.record.calls.filter(c => c.name === 'bezierCurveTo').length > 100, 'sculpted cloth and anatomy, not oval placeholders');
  const maskCalls = a.mask.record.calls;
  assert.ok(maskCalls.some(c => c.name === 'drawImage' && c.args[0] === a.canvas));
  assert.ok(maskCalls.some(c => c.name === 'fillRect' && c.globalCompositeOperation === 'source-in'), 'flash/ghost preserve original sprite alpha');
  assert.ok(a.bounds.height >= 45 && a.bounds.height <= 55);
  assert.ok(a.bounds.width >= 27 && a.bounds.width <= 34);
});

test('three base weapons and three evolved weapons have distinct cached silhouettes and common bullet-aligned muzzles', () => {
  const { character: c } = load(); const a = c.init();
  const ids = new Set(); const outlines = new Set();
  for (const key of ['pistol', 'shotgun', 'repeater']) for (const variant of ['base', 'evolved']) {
    const w = a.weapons[key][variant]; ids.add(w.part); outlines.add(JSON.stringify(w.outline));
    assert.ok(a.parts[w.part]); assert.equal(w.muzzle.x, 24); assert.equal(w.muzzle.y, 0);
    const r = recorder(); c.draw(r.ctx, player({ weapon: key, evolved: variant === 'evolved', aim: 0, recoil: 0 }), 1);
    const part = a.parts[w.part];
    assert.ok(sprites(r).some(d => d.args[1] === part.x * 3 && d.args[2] === part.y * 3));
  }
  assert.equal(ids.size, 6); assert.equal(outlines.size, 6, 'evolution is silhouette design, not just tint');
});

test('pose chooses eight directions, remains pure, and articulates alternating boots, inertia and recoil', () => {
  const { character: c } = load();
  const p = Object.freeze(player()); const before = json(p);
  const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
  const poses = angles.map(aim => c.pose({ ...p, aim }, 2));
  assert.equal(new Set(poses.map(p => p.facing)).size, 8);
  assert.ok(new Set(poses.map(p => p.frame + ':' + p.mirror)).size >= 6, 'direction-specific painted views, not spin a torso oval');
  const moving = c.pose(p, 2);
  assert.ok(moving.stepLeft * moving.stepRight < 0, 'feet counterphase');
  assert.ok(Math.abs(moving.cloak) > 0); assert.ok(Math.abs(moving.lean) > 0); assert.ok(Math.abs(moving.wrist) > 0);
  assert.equal(moving.aim, p.aim);
  assert.notDeepEqual(json(c.pose(player({ dashT: 0.16, dashDirX: 1 }), 2)), json(moving));
  assert.deepEqual(json(p), before);
  const captured = c.capture(p, 2); assert.ok(Object.isFrozen(captured));
  assert.deepEqual(json(captured), json(c.capture(p, 2)));
});

test('reduceMotion makes all time-dependent pose and rendering static while keeping exact aim', () => {
  const { character: c } = load(); c.init(); const p = player({ dashT: 0.1 });
  const options = { reduceMotion: true };
  assert.deepEqual(json(c.pose(p, 0, options)), json(c.pose(p, 700, options)));
  const pose = c.pose(p, 700, options);
  for (const key of ['bob', 'stepLeft', 'stepRight', 'lean', 'cloak', 'scarf', 'lantern', 'wrist', 'recoil']) assert.equal(pose[key], 0, key + ' is static');
  const a = recorder(), b = recorder(); c.draw(a.ctx, p, 0, options); c.draw(b.ctx, p, 700, options);
  assert.deepEqual(signature(a.calls), signature(b.calls));
});

test('draw is finite, restores Canvas state, never mutates player and allocates no draw-time canvases', () => {
  const { character: c, canvases } = load(); const a = c.init(); const count = canvases.length;
  for (const aim of [0, 0.8, 1.7, 3.1, -1.7, NaN, Infinity]) {
    const p = Object.freeze(player({ aim, hurtFlash: 0.8, evolved: true, dashT: 0.1 })); const before = json(p);
    for (const options of [{}, { highContrast: true }, { low: true }, { reduceMotion: true }]) {
      const r = recorder(); const state = r.styles(); const matrix = r.matrix();
      c.draw(r.ctx, p, Infinity, options);
      assert.deepEqual(r.styles(), state); assert.deepEqual(r.matrix(), matrix); assert.equal(r.stack.length, 0);
      assert.ok(sprites(r).length >= 12, 'full layered figure'); assertPartDrawsInsideAtlas(sprites(r), a);
      assert.ok(!r.calls.some(call => /Gradient/.test(call.name)), 'all painterly gradients are cached');
      assert.ok(!r.calls.some(call => ['ellipse', 'bezierCurveTo', 'quadraticCurveTo'].includes(call.name)), 'no rebuilding geometry on draw');
    }
    assert.deepEqual(json(p), before);
  }
  assert.equal(canvases.length, count);
});

test('gun rotates by p.aim exactly and up-facing gun is occluded behind torso; muzzle follows p + 24 angle', () => {
  const { character: c } = load(); const a = c.init();
  for (const aim of [-Math.PI/2, -0.9, 0, Math.PI/2, 2.6]) {
    const p = player({ aim, recoil: 0, vx: 0, vy: 0, muzzle: 0 }); const pose = c.pose(p, 0, { reduceMotion: true });
    const r = recorder(); c.draw(r.ctx, p, 0, { reduceMotion: true }); const draws = sprites(r);
    const gun = a.parts[a.weapons.pistol.base.part], torso = a.parts['torso-' + pose.frame];
    const find = part => draws.findIndex(d => d.args[0] === a.canvas && d.args[1] === part.x * 3 && d.args[2] === part.y * 3);
    const gi = find(gun), ti = find(torso); assert.ok(gi >= 0 && ti >= 0);
    assert.equal(gi < ti, Math.sin(aim) < -0.25, 'up-pointing gun is rear layer');
    const [aa,bb,cc,dd,e,f] = draws[gi].matrix;
    assert.ok(Math.abs(aa - Math.cos(aim)) < 1e-10 && Math.abs(bb - Math.sin(aim)) < 1e-10);
    assert.ok(Math.abs(e + aa*24 - (p.x + Math.cos(aim)*24)) < 1e-10);
    assert.ok(Math.abs(f + bb*24 - (p.y + Math.sin(aim)*24)) < 1e-10);
    assert.ok(Math.abs(cc + Math.sin(aim)) < 1e-10 && Math.abs(dd - Math.cos(aim)) < 1e-10);
  }
});

test('hurtFlash overlays exact cached masks on the same part transforms, not an ellipse or bounding box', () => {
  const { character: c } = load(); const a = c.init(); const r = recorder();
  c.draw(r.ctx, player({ hurtFlash: 0.9, muzzle: 0 }), 1);
  const draws = sprites(r); const color = draws.filter(d => d.args[0] === a.canvas), masks = draws.filter(d => d.args[0] === a.mask);
  assert.equal(masks.length, color.length);
  for (let i = 0; i < color.length; i++) {
    assert.deepEqual(masks[i].args.slice(1), color[i].args.slice(1)); assert.deepEqual(masks[i].matrix, color[i].matrix);
  }
});

test('ghost uses the full captured articulated figure and weapon silhouette with bounded fading and no allocation', () => {
  const { character: c, canvases } = load(); const a = c.init();
  const p = player({ muzzle: 0, hurtFlash: 0, dashT: 0.1 }); const captured = c.capture(p, 4);
  const live = recorder(); c.draw(live.ctx, p, 4);
  const ghost = recorder(); const state = ghost.styles(); const afterimage = Object.freeze({ x: p.x, y: p.y, a: p.aim, life: 0.2, max: 0.3, pose: captured });
  c.drawGhost(ghost.ctx, afterimage, player({ weapon: 'shotgun', aim: 2 }), {});
  const liveDraws = sprites(live), ghostDraws = sprites(ghost);
  assert.equal(ghostDraws.length, liveDraws.length, 'hat, face, coat, arms, boots, lantern and gun all leave a trail');
  for (let i = 0; i < ghostDraws.length; i++) {
    assert.equal(ghostDraws[i].args[0], a.mask);
    assert.deepEqual(ghostDraws[i].args.slice(1), liveDraws[i].args.slice(1));
    assert.deepEqual(ghostDraws[i].matrix, liveDraws[i].matrix);
    assert.ok(ghostDraws[i].globalAlpha <= 0.35);
  }
  assert.deepEqual(ghost.styles(), state); assert.equal(ghost.stack.length, 0);
  for (let i = 0; i < 120; i++) c.drawGhost(recorder().ctx, { x: i, y: 0, a: -1, life: 4, max: 0 }, p, { low: true });
  assert.equal(canvases.length, 2);
  const expired = recorder(); c.drawGhost(expired.ctx, { life: 0, max: 1 }, p); assert.equal(sprites(expired).length, 0);
  const reduced = recorder(); c.drawGhost(reduced.ctx, afterimage, p, { reduceMotion: true }); assert.equal(sprites(reduced).length, 0);
});

test('anchors expose the actual articulated lantern glass and aim-aligned muzzle without allocating or mutating p', () => {
  const { character: c, canvases } = load(); c.init(); const created = canvases.length;
  assert.equal(typeof c.anchors, 'function', 'anchor API must be public');
  const point = (call, x, y) => {
    const [a, b, d, e, tx, ty] = [call.matrix[0], call.matrix[1], call.matrix[2], call.matrix[3], call.matrix[4], call.matrix[5]];
    return { x: a * x + d * y + tx, y: b * x + e * y + ty };
  };
  const close = (actual, expected, message) => {
    assert.ok(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9,
      `${message}: got (${actual.x},${actual.y}), expected (${expected.x},${expected.y})`);
  };
  const aims = [0, Math.PI / 2, Math.PI, -Math.PI / 2, 3 * Math.PI / 4, -3 * Math.PI / 4];
  for (const aim of aims) for (const options of [{}, { reduceMotion: true }]) {
    const p = Object.freeze(player({ x: 91, y: -44, aim, vx: 160, vy: -80, walkPhase: 1.3, recoil: 1.7, muzzle: 0.08 }));
    const before = json(p); const q = c.pose(p, 2.75, options); const r = recorder();
    c.draw(r.ctx, p, 2.75, options);
    const draws = sprites(r), lantern = c.assets.parts.lantern;
    const weapon = c.assets.weapons.pistol[q.evolved ? 'evolved' : 'base'];
    const lanternCall = draws.find(d => d.args[0] === c.assets.canvas && d.args[1] === lantern.x * 3 && d.args[2] === lantern.y * 3);
    const gunCall = draws.find(d => d.args[0] === c.assets.canvas && d.args[1] === c.assets.parts[weapon.part].x * 3 && d.args[2] === c.assets.parts[weapon.part].y * 3);
    assert.ok(lanternCall && gunCall, 'draw must expose both source transforms for anchor comparison');
    close(c.anchors(p, 2.75, options).lantern, point(lanternCall, 0, 4), 'lantern anchor follows the glass');
    close(c.anchors(p, 2.75, options).muzzle, point(gunCall, 24, 0), 'muzzle anchor follows the barrel');
    const anchors = c.anchors(p, 2.75, options);
    assert.equal(anchors.muzzleAlpha, options.reduceMotion ? 0 : q.muzzle);
    for (const name of ['lantern', 'muzzle']) {
      assert.ok(Number.isFinite(anchors[name].x) && Number.isFinite(anchors[name].y), name + ' anchor finite');
      assert.ok(Object.isFrozen(anchors[name]), name + ' point immutable');
    }
    assert.ok(Object.isFrozen(anchors));
    assert.deepEqual(json(p), before);
  }
  assert.equal(canvases.length, created, 'anchors never create canvases');
});

test('uninitialized draw fails clearly rather than allocating during the frame; dead players draw nothing', () => {
  const { character: c, canvases } = load();
  assert.throws(() => c.draw(recorder().ctx, player(), 0), /init/i);
  assert.equal(canvases.length, 0); c.init();
  const r = recorder(); c.draw(r.ctx, player({ dead: true }), 0); assert.equal(sprites(r).length, 0);
});
