'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf8');

// Only the WebAudio boundary is faked: run the real module in an isolated browser-like VM.
function loadAudio() {
  let context;
  let clock = 1000;
  let timerId = 0;
  const intervals = new Map();
  const timeouts = new Map();

  function finite(value, label) {
    assert.ok(Number.isFinite(value), `${label} must be finite, got ${value}`);
  }

  class Param {
    constructor(value, label, min = -Infinity, max = Infinity) {
      this.label = label;
      this.min = min;
      this.max = max;
      this.events = [];
      this.value = value;
    }
    get value() {
      if (!this.ramp) return this.currentValue;
      const { start, end, from, to } = this.ramp;
      const progress = Math.max(0, Math.min(1, (context.currentTime - start) / (end - start)));
      return from + (to - from) * progress;
    }
    set value(value) {
      finite(value, this.label);
      assert.ok(value >= this.min && value <= this.max, `${this.label} out of range: ${value}`);
      this.currentValue = value;
      this.ramp = null;
    }
    at(method, value, time, constant) {
      finite(time, `${this.label} automation time`);
      assert.ok(time >= 0, 'automation cannot start before zero');
      if (method === 'exponential') assert.ok(value > 0, 'exponential target must be positive');
      if (constant != null) {
        finite(constant, 'time constant');
        assert.ok(constant > 0, 'time constant must be positive');
      }
      this.value = value;
      this.events.push({ method, value, time, constant });
      return this;
    }
    cancelScheduledValues(time) {
      finite(time, 'cancel time');
      if (this.ramp) {
        const current = this.value; // Hold the modeled value at cancellation time.
        this.value = current;
      }
      this.events.push({ method: 'cancel', time });
      return this;
    }
    setValueAtTime(value, time) { return this.at('set', value, time); }
    linearRampToValueAtTime(value, time) {
      const previous = this.events.at(-1);
      assert.equal(previous.method, 'set', 'linear ramp needs an anchored starting value');
      assert.ok(time > previous.time, 'linear ramp must take positive time');
      this.at('linear', value, time);
      this.ramp = { start: previous.time, end: time, from: previous.value, to: value };
      return this;
    }
    exponentialRampToValueAtTime(value, time) { return this.at('exponential', value, time); }
    setTargetAtTime(value, time, constant) { return this.at('target', value, time, constant); }
  }

  class Node {
    constructor(kind) {
      this.kind = kind;
      this.connections = [];
      this.starts = [];
      this.stops = [];
      if (kind === 'gain') this.gain = new Param(1, 'gain', 0);
      if (kind === 'oscillator' || kind === 'filter') {
        this.frequency = new Param(440, 'frequency', 0);
        this.detune = new Param(0, 'detune');
      }
      if (kind === 'filter') this.Q = new Param(1, 'Q', 0);
      if (kind === 'panner') this.pan = new Param(0, 'pan', -1, 1);
      for (const value of Object.values(this)) if (value instanceof Param) value.owner = this;
    }
    connect(node) { this.connections.push(node); return node; }
    start(time = context.currentTime) {
      finite(time, 'source start');
      assert.ok(time >= 0);
      assert.equal(this.starts.length, 0, 'a source cannot start twice');
      this.starts.push(time);
    }
    stop(time = context.currentTime) {
      finite(time, 'source stop');
      assert.ok(time >= this.starts[0], 'a source cannot stop before starting');
      this.stops.push(time);
    }
  }

  class AudioContext {
    constructor() {
      context = this;
      this.currentTime = 10;
      this.sampleRate = 8000;
      this.state = 'running';
      this.nodes = [];
      this.destination = new Node('destination');
      this.resumeCalls = 0;
    }
    node(kind) { const node = new Node(kind); this.nodes.push(node); return node; }
    createGain() { return this.node('gain'); }
    createOscillator() { return this.node('oscillator'); }
    createBufferSource() { return this.node('buffer'); }
    createBiquadFilter() { return this.node('filter'); }
    createStereoPanner() { return this.node('panner'); }
    createBuffer(channels, length) {
      assert.equal(channels, 1);
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    }
    resume() { this.resumeCalls++; this.state = 'running'; return Promise.resolve(); }
  }

  const window = { AudioContext };
  vm.runInNewContext(source, {
    window,
    performance: { now: () => clock },
    setInterval: (fn, ms) => { const id = ++timerId; intervals.set(id, { fn, ms }); return id; },
    clearInterval: id => intervals.delete(id),
    setTimeout: (fn, ms) => { const id = ++timerId; timeouts.set(id, { fn, ms }); return id; }
  }, { filename: 'audio.js' });

  return {
    fx: window.AudioFX,
    get ctx() { return context; },
    advance(ms) { clock += ms; if (context) context.currentTime += ms / 1000; },
    tickIntervals() { for (const { fn } of [...intervals.values()]) fn(); },
    flushTimeouts() { for (const { fn } of timeouts.values()) fn(); timeouts.clear(); },
    intervals,
    sources() { return context.nodes.filter(n => n.kind === 'oscillator' || n.kind === 'buffer'); }
  };
}

function reaches(node, destination, audible = false, seen = new Set()) {
  if (node === destination) return true;
  if (!node || seen.has(node)) return false;
  if (audible && node.gain && node.gain.value === 0) return false;
  seen.add(node);
  // An LFO reaches the output through the AudioParam that it modulates.
  const outputs = node.owner ? [node.owner] : (node.connections || []);
  return outputs.some(next => reaches(next, destination, audible, new Set(seen)));
}

function masterOf(h) {
  return h.ctx.nodes.find(n => n.kind === 'gain' && n.connections.includes(h.ctx.destination));
}

const sceneEffects = [
  ['shot', [0]], ['hit', [0]], ['crit', [0]], ['kill', [0]], ['gem', [2]],
  ['heal', []], ['hurt', []], ['dash', []], ['shield', []], ['levelUp', []],
  ['explosion', [1]], ['bossRoar', []], ['portal', []], ['victory', []], ['gameOver', []],
  ['heartbeat', [0.7]], ['warning', []], ['achievement', []]
];

test('legacy scene effects and UI still synthesize finite, bounded, one-shot envelopes', () => {
  const h = loadAudio();
  h.fx.init();
  for (const [name, args] of [...sceneEffects, ['select', []], ['hover', []]]) {
    const before = h.sources().length;
    h.advance(1000);
    h.fx[name](...args);
    const made = h.sources().slice(before);
    assert.ok(made.length > 0, `${name} should synthesize a sound`);
    for (const node of made) {
      assert.equal(node.starts.length, 1);
      assert.equal(node.stops.length, 1, `${name} must stop its one-shot source`);
      assert.ok(reaches(node, h.ctx.destination), `${name} needs an output route`);
    }
  }
});

function shotProfile(weapon) {
  const h = loadAudio();
  h.fx.init();
  h.fx.shot(0.25, weapon);
  return h.ctx.nodes.filter(n => n.starts.length || n.kind === 'filter').map(n => ({
    kind: n.kind,
    type: n.type,
    frequency: n.frequency && n.frequency.value,
    duration: n.stops.length ? n.stops[0] - n.starts[0] : null
  }));
}

test('shot defaults to the original pistol and unsupported weapons fall back to it', () => {
  const pistol = shotProfile('pistol');
  assert.equal(pistol.filter(n => n.kind === 'oscillator').length, 2);
  assert.equal(pistol.find(n => n.kind === 'filter').frequency, 1400);
  assert.deepEqual(shotProfile(), pistol);
  assert.deepEqual(shotProfile('unknown'), pistol);
  assert.deepEqual(shotProfile(null), pistol);
});

test('shotgun has a heavier, longer body and repeater has a short high twang, distinct from pistol', () => {
  const pistol = shotProfile('pistol');
  const shotgun = shotProfile('shotgun');
  const repeater = shotProfile('repeater');
  assert.notDeepEqual(shotgun, pistol, 'shotgun cannot reuse the pistol voice');
  assert.notDeepEqual(repeater, pistol, 'repeater cannot reuse the pistol voice');
  assert.notDeepEqual(repeater, shotgun);
  const longest = profile => Math.max(...profile.map(n => n.duration || 0));
  assert.ok(longest(shotgun) > longest(pistol), 'shotgun should have a longer body');
  assert.ok(longest(repeater) < longest(pistol), 'repeater should sound quick and light');
});

test('spatial effects clamp pan boundaries and replace non-finite pan with center', () => {
  for (const [input, expected] of [[-4, -1], [4, 1], [0.4, 0.4], [NaN, 0], [Infinity, 0], [-Infinity, 0]]) {
    for (const [name, weapon] of [['shot', 'pistol'], ['shot', 'shotgun'], ['shot', 'repeater'], ['hit'], ['crit'], ['kill']]) {
      const h = loadAudio();
      h.fx.init();
      assert.doesNotThrow(() => h.fx[name](input, weapon), `${name} must not send ${input} to WebAudio`);
      const panners = h.ctx.nodes.filter(n => n.kind === 'panner');
      assert.ok(panners.length > 0);
      assert.ok(panners.every(n => n.pan.value === expected));
    }
  }
});

test('weapon shots remain rate-limited and route every voice to the scene output', () => {
  for (const weapon of ['pistol', 'shotgun', 'repeater']) {
    const h = loadAudio();
    h.fx.init();
    h.fx.shot(0.8, weapon);
    const count = h.sources().length;
    assert.ok(count >= 2);
    h.fx.shot(0.8, weapon);
    h.advance(37);
    h.fx.shot(0.8, weapon);
    assert.equal(h.sources().length, count);
    h.advance(1);
    h.fx.shot(0.8, weapon);
    assert.equal(h.sources().length, count * 2);
    assert.ok(h.sources().every(n => n.stops.length === 1 && reaches(n, h.ctx.destination)));
  }
});

test('pause and resume use a 25–40ms scene-only linear ramp anchored at the current gain', () => {
  const h = loadAudio();
  h.fx.init();
  h.fx.startAmbient();
  const master = masterOf(h);
  const masterEvents = master.gain.events.length;
  const nodeCount = h.ctx.nodes.length;
  const timers = h.intervals.size;
  const directGains = h.ctx.nodes.filter(n => n.kind === 'gain' && n.connections.includes(master));
  const before = new Map(directGains.map(n => [n, n.gain.events.length]));
  const t = h.ctx.currentTime;
  h.fx.setPaused(true);
  const changed = directGains.filter(n => n.gain.events.length > before.get(n));
  assert.equal(changed.length, 1, 'only the scene bus may change');
  const gain = changed[0].gain;
  assert.deepEqual(gain.events.map(event => event.method), ['cancel', 'set', 'linear'], 'pause must fade, not jump');
  assert.equal(gain.events[0].time, t);
  assert.equal(gain.events[1].time, t);
  assert.equal(gain.events[1].value, 1, 'fade starts at current gain');
  assert.equal(gain.events[2].value, 0);
  const duration = gain.events[2].time - t;
  assert.ok(duration >= 0.025 && duration <= 0.04, 'fade must last 25–40ms');
  assert.equal(gain.value, 1, 'gain must not jump to zero at the call');
  h.advance(duration * 500);
  assert.ok(Math.abs(gain.value - 0.5) < 1e-9, 'pause fades through its midpoint');
  h.advance(duration * 500 + 0.001);
  assert.equal(gain.value, 0, 'pause is silent at the target time');
  const tt = h.ctx.currentTime;
  h.fx.setPaused(false);
  const resume = gain.events.slice(-3);
  assert.deepEqual(resume.map(event => event.method), ['cancel', 'set', 'linear']);
  assert.equal(resume[1].time, tt);
  assert.equal(resume[1].value, 0);
  assert.equal(resume[2].value, 1);
  assert.ok(resume[2].time - tt >= 0.025 && resume[2].time - tt <= 0.04);
  h.advance(40);
  assert.equal(gain.value, 1);
  assert.equal(master.gain.events.length, masterEvents);
  assert.equal(h.ctx.nodes.length, nodeCount);
  assert.equal(h.intervals.size, timers);
});

test('reversing pause during a fade anchors the next ramp at the interpolated gain', () => {
  const h = loadAudio();
  h.fx.init();
  const master = masterOf(h);
  h.fx.setPaused(true);
  const gain = h.ctx.nodes.find(n => n.kind === 'gain' && n.connections.includes(master) && n.gain.events.length).gain;
  assert.equal(gain.events.at(-1).method, 'linear');
  const duration = gain.events.at(-1).time - h.ctx.currentTime;
  h.advance(duration * 500);
  const current = gain.value;
  assert.ok(Math.abs(current - 0.5) < 1e-9);
  h.fx.setPaused(false);
  assert.ok(Math.abs(gain.events.at(-2).value - current) < 1e-9, 'rapid resume must not jump to an endpoint');
  assert.ok(Math.abs(gain.value - current) < 1e-9);
  h.advance(40);
  assert.equal(gain.value, 1);
});

test('pause gates existing scene music/SFX, but leaves menu feedback and master preference alone', () => {
  const h = loadAudio();
  h.fx.init();
  h.fx.setVolume(0.31);
  h.fx.startAmbient();
  h.fx.setCombatLevel(0.9);
  h.fx.setBossMusic(true);
  h.fx.hurt();
  const existing = h.sources();
  const master = masterOf(h);
  const masterEvents = master.gain.events.length;
  assert.ok(existing.every(n => reaches(n, h.ctx.destination, true)));

  h.fx.setPaused(true);
  assert.equal(h.fx.getVolume(), 0.31);
  assert.equal(h.fx.isMuted(), false);
  assert.equal(master.gain.events.length, masterEvents, 'pause must not automate master gain');
  h.advance(40); // Scene silence is required at the short fade's target, not at its start.
  assert.ok(existing.every(n => !reaches(n, h.ctx.destination, true)), 'already playing scene sounds must be silent after the fade');

  const before = h.sources().length;
  for (const [name, args] of sceneEffects) { h.advance(1000); h.fx[name](...args); }
  h.tickIntervals();
  assert.equal(h.sources().length, before, 'paused scene/timer calls must not create sounds');
  h.fx.select();
  h.fx.hover();
  assert.ok(h.sources().slice(before).every(n => reaches(n, h.ctx.destination, true)), 'UI bypasses the scene gate');
  assert.equal(h.sources().length, before + 3);
});

test('menu feedback still obeys user mute during pause and scene silence survives intensity updates', () => {
  const h = loadAudio();
  h.fx.init();
  h.fx.startAmbient();
  h.fx.setPaused(true);
  h.fx.setIntensity(1);
  h.fx.setCombatLevel(1);
  h.fx.setBossMusic(true);
  h.tickIntervals();
  h.advance(40);
  assert.ok(h.sources().every(n => !reaches(n, h.ctx.destination, true)));
  h.fx.setMuted(true);
  const count = h.sources().length;
  h.fx.select();
  h.fx.hover();
  assert.equal(h.sources().length, count, 'UI does not bypass user mute');
  h.fx.setMuted(false);
  h.fx.hover();
  assert.ok(reaches(h.sources().at(-1), h.ctx.destination, true));
  assert.ok(h.sources().slice(0, count).every(n => !reaches(n, h.ctx.destination, true)));
});

test('stopping ambient during pause still cleans sources and a later start creates only one ambient layer', () => {
  const h = loadAudio();
  h.fx.init();
  h.fx.startAmbient();
  h.fx.setCombatLevel(1);
  h.fx.setBossMusic(true);
  const old = h.sources();
  h.fx.setPaused(true);
  h.fx.stopAmbient();
  h.flushTimeouts();
  assert.equal(h.intervals.size, 0);
  assert.ok(old.every(n => n.stops.length === 1));
  h.fx.setPaused(false);
  assert.equal(h.sources().length, old.length, 'unpause must not restart stopped music');
  h.fx.startAmbient();
  const count = h.sources().length;
  assert.ok(count > old.length);
  h.fx.startAmbient();
  assert.equal(h.sources().length, count);
  assert.equal(h.intervals.size, 1);
});

test('resume reopens the scene without duplicating ambient sources or timers, and shot is immediately usable', () => {
  const h = loadAudio();
  h.fx.init();
  h.fx.startAmbient();
  h.fx.setCombatLevel(0.8);
  h.fx.setBossMusic(true);
  const sources = h.sources();
  const timers = h.intervals.size;
  for (let i = 0; i < 3; i++) {
    h.fx.setPaused(true);
    h.fx.setPaused(true);
    h.fx.shot(0); // Must not consume the weapon cooldown while paused.
    h.fx.resume(); // Unlocking the context for a menu click must not unpause the scene.
    h.fx.startAmbient();
    h.tickIntervals();
    h.advance(40);
    assert.ok(sources.every(n => !reaches(n, h.ctx.destination, true)));
    h.fx.setPaused(false);
    h.fx.setPaused(false);
    h.advance(40);
    assert.equal(h.sources().length, sources.length);
    assert.equal(h.intervals.size, timers);
    assert.ok(sources.every(n => reaches(n, h.ctx.destination, true)));
  }
  h.fx.shot(0);
  assert.ok(h.sources().length > sources.length, 'shot can play immediately after resume');
  h.tickIntervals();
  assert.ok(h.sources().length > sources.length + 3, 'combat pulse resumes');
});

const newEffects = ['footstep', 'beacon', 'perfectDodge'];

for (const name of newEffects) {
  test(`${name} synthesizes a finite, bounded scene sound with ordered envelopes and stopped sources`, () => {
    const h = loadAudio();
    h.fx.init();
    h.fx[name]();
    assert.ok(h.sources().length >= 2, `${name} needs a layered sound`);
    for (const node of h.sources()) {
      assert.equal(node.starts.length, 1);
      assert.equal(node.stops.length, 1);
      assert.ok(node.stops[0] > node.starts[0]);
      assert.ok(reaches(node, h.ctx.destination, true));
    }
    for (const node of h.ctx.nodes) {
      if (!node.gain || node.gain.events.length === 0) continue;
      const events = node.gain.events.filter(event => event.method !== 'cancel');
      assert.ok(events.some(event => event.value > 0.0002), 'envelope must have an audible peak');
      assert.equal(events.at(-1).value, 0.0001, 'one-shot envelope returns to silence');
      for (let i = 1; i < events.length; i++) {
        assert.ok(events[i].time >= events[i - 1].time, 'envelope stages must be ordered');
      }
    }
  });
}

test('new scene sounds are safe before initialization, muted, and paused, and are usable immediately after resume', () => {
  for (const name of newEffects) {
    const h = loadAudio();
    assert.doesNotThrow(() => h.fx[name](), name);
    h.fx.init();
    h.fx.setMuted(true);
    h.fx[name]();
    assert.equal(h.sources().length, 0, `${name} obeys mute`);
    h.fx.setMuted(false);
    h.fx.setPaused(true);
    h.fx[name]();
    assert.equal(h.sources().length, 0, `${name} must not schedule during pause`);
    h.fx.setPaused(false);
    h.fx[name]();
    assert.ok(h.sources().length > 0, `${name} must not consume cooldown while paused`);
    h.fx.setPaused(true);
    h.advance(40);
    assert.ok(h.sources().every(node => !reaches(node, h.ctx.destination, true)), 'pause gates existing new effects at the fade target');
  }
});

test('footsteps and beacon pulses reject duplicate triggers but recover at their cadence', () => {
  for (const [name, cooldown] of [['footstep', 180], ['beacon', 700]]) {
    const h = loadAudio();
    h.fx.init();
    h.fx[name]();
    const count = h.sources().length;
    h.fx[name]();
    h.advance(cooldown - 1);
    h.fx[name]();
    assert.equal(h.sources().length, count, `${name} should be throttled`);
    h.advance(1);
    h.fx[name]();
    assert.equal(h.sources().length, count * 2, `${name} can play at the next cadence`);
  }
});

test('pause can precede lazy initialization and remains separate from mute/volume changes', () => {
  const h = loadAudio();
  h.fx.setPaused(true);
  assert.equal(h.ctx, undefined, 'setting pause must not create an AudioContext');
  h.fx.setVolume(0.42);
  h.fx.setMuted(true);
  h.fx.init();
  const master = masterOf(h);
  assert.equal(master.gain.value, 0);
  h.fx.startAmbient();
  h.fx.setMuted(false);
  h.fx.setVolume(0.23);
  assert.ok(h.sources().every(n => !reaches(n, h.ctx.destination, true)));
  h.fx.select();
  assert.ok(reaches(h.sources().at(-1), h.ctx.destination, true));
  h.fx.setMuted(true);
  h.fx.setPaused(false);
  assert.equal(h.fx.isMuted(), true);
  assert.equal(h.fx.getVolume(), 0.23);
  assert.ok(master.gain.value < 0.001, 'unpause must not unmute');
  h.fx.setMuted(false);
  assert.equal(master.gain.value, 0.23);
  h.advance(40);
  assert.ok(h.sources().every(n => reaches(n, h.ctx.destination, true)));
});
