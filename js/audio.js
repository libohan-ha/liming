/* =========================================================
   长夜将尽 · Audio
   全部音效与氛围音乐由 WebAudio 实时合成
   ========================================================= */
window.AudioFX = (function () {
  'use strict';

  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let noiseBuf = null;
  let muted = false;
  let volume = 0.55;
  let ready = false;
  let ambientOn = false;
  let ambientTimer = null;
  let windNodes = null;
  let chordOsc = [];
  let chordIndex = 0;
  let lastShot = 0;
  let lastHit = 0;
  let lastGem = 0;
  // 动态战斗层
  let combatLevel = 0;
  let bossMusic = false;
  let combatTimer = null;
  let combatStep = 0;
  let bossDrone = null;

  const CHORDS = [
    [110.00, 130.81, 164.81], // Am
    [87.31, 130.81, 174.61],  // F
    [73.42, 110.00, 146.83],  // Dm
    [82.41, 123.47, 164.81]   // E
  ];

  function init() {
    if (ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
    } catch (e) { return; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    sfxBus.connect(master);

    // 噪声缓冲
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    ready = true;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function resume() {
    if (!ready) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function env(gainNode, t0, peak, attack, decay, sustain, release, dur) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.exponentialRampToValueAtTime(Math.max(0.0002, sustain), t0 + attack + decay);
    g.setValueAtTime(Math.max(0.0002, sustain), t0 + dur - release);
    g.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function noise(dur, filterType, freq, q, gain, pan) {
    if (!ready) return;
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.value = freq || 800;
    f.Q.value = q || 1;
    const g = ctx.createGain();
    env(g, t, gain, 0.004, dur * 0.35, gain * 0.35, dur * 0.5, dur);
    src.connect(f); f.connect(g);
    if (pan != null) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(sfxBus);
    } else {
      g.connect(sfxBus);
    }
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function tone(type, f0, f1, dur, gain, pan, delay) {
    if (!ready) return;
    const t = now() + (delay || 0);
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, gain, 0.005, dur * 0.3, gain * 0.4, dur * 0.55, dur);
    o.connect(g);
    if (pan != null) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(sfxBus);
    } else {
      g.connect(sfxBus);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /* ---------- 音效 ---------- */
  function shot(pan) {
    if (!ready || muted) return;
    const t = performance.now();
    if (t - lastShot < 38) return;
    lastShot = t;
    noise(0.09, 'bandpass', 1400, 0.9, 0.16, pan);
    tone('triangle', 190, 52, 0.11, 0.14, pan);
    tone('square', 90, 40, 0.07, 0.05, pan);
  }

  function hit(pan) {
    if (!ready || muted) return;
    const t = performance.now();
    if (t - lastHit < 26) return;
    lastHit = t;
    noise(0.045, 'highpass', 2600, 0.7, 0.07, pan);
    tone('square', 320, 180, 0.04, 0.025, pan);
  }

  function crit(pan) {
    if (!ready || muted) return;
    tone('triangle', 1200, 700, 0.09, 0.07, pan);
    noise(0.06, 'highpass', 4000, 0.8, 0.06, pan);
  }

  function kill(pan) {
    if (!ready || muted) return;
    noise(0.12, 'lowpass', 700, 0.8, 0.1, pan);
    tone('sine', 130, 48, 0.16, 0.12, pan);
  }

  function gem(combo) {
    if (!ready || muted) return;
    const t = performance.now();
    if (t - lastGem < 32) return;
    lastGem = t;
    const base = 620 + Math.min(9, combo || 0) * 42;
    tone('sine', base, base * 1.5, 0.09, 0.055);
    tone('triangle', base * 2, base * 2.02, 0.06, 0.018);
  }

  function heal() {
    if (!ready || muted) return;
    [523.25, 659.25, 783.99].forEach((f, i) => tone('sine', f, f, 0.5, 0.055, null, i * 0.07));
  }

  function hurt() {
    if (!ready || muted) return;
    noise(0.28, 'lowpass', 900, 0.7, 0.2);
    tone('sawtooth', 160, 46, 0.34, 0.14);
    tone('square', 70, 34, 0.22, 0.08);
  }

  function dash() {
    if (!ready || muted) return;
    noise(0.2, 'bandpass', 500, 1.2, 0.1);
    // 噪声扫频用滤波器近似
    tone('sine', 240, 700, 0.16, 0.035);
  }

  // 护盾破碎：金属脆响
  function shield() {
    if (!ready || muted) return;
    noise(0.22, 'highpass', 3200, 1.1, 0.1);
    tone('triangle', 960, 520, 0.3, 0.075);
    tone('sine', 1480, 740, 0.26, 0.03);
  }

  function levelUp() {
    if (!ready || muted) return;
    const notes = [392.0, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((f, i) => {
      tone('sine', f, f, 0.85, 0.075, null, i * 0.085);
      tone('triangle', f * 2, f * 2, 0.5, 0.02, null, i * 0.085);
    });
    noise(0.5, 'highpass', 6000, 0.6, 0.02);
  }

  function select() {
    if (!ready || muted) return;
    tone('triangle', 720, 980, 0.12, 0.07);
    tone('sine', 1440, 1440, 0.16, 0.025);
  }

  function hover() {
    if (!ready || muted) return;
    tone('sine', 1100, 1250, 0.05, 0.018);
  }

  function explosion(size) {
    if (!ready || muted) return;
    const s = size || 1;
    noise(0.3 * s, 'lowpass', 500, 0.6, 0.18 * s);
    tone('sine', 90, 28, 0.4 * s, 0.18 * s);
    tone('sawtooth', 60, 24, 0.28 * s, 0.06 * s);
  }

  function bossRoar() {
    if (!ready || muted) return;
    tone('sawtooth', 72, 26, 1.4, 0.16);
    tone('sawtooth', 48, 22, 1.7, 0.12);
    noise(1.3, 'lowpass', 420, 0.8, 0.14);
  }

  function portal() {
    if (!ready || muted) return;
    tone('sine', 160, 420, 0.35, 0.03);
    noise(0.35, 'bandpass', 1200, 2, 0.03);
  }

  function victory() {
    if (!ready || muted) return;
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
    chord.forEach((f, i) => {
      tone('sine', f, f, 3.2, 0.075, null, i * 0.12);
      tone('triangle', f * 2, f * 2, 2.4, 0.02, null, i * 0.12);
    });
  }

  function gameOver() {
    if (!ready || muted) return;
    [220, 174.61, 146.83, 110].forEach((f, i) => {
      tone('sine', f, f, 1.6, 0.08, null, i * 0.28);
      tone('triangle', f * 0.5, f * 0.5, 2.0, 0.04, null, i * 0.28);
    });
  }

  // 低血量心跳：两声闷响
  function heartbeat(intensity) {
    if (!ready || muted) return;
    const k = clamp01(intensity == null ? 0.7 : intensity);
    tone('sine', 62, 40, 0.18, 0.13 * k);
    tone('sine', 54, 34, 0.24, 0.09 * k, null, 0.17);
    noise(0.1, 'lowpass', 220, 0.8, 0.035 * k);
  }

  // Boss 预警：远处号角
  function warning() {
    if (!ready || muted) return;
    tone('sawtooth', 55, 41, 2.4, 0.075);
    tone('triangle', 110, 82, 2.0, 0.05, null, 0.08);
    tone('sine', 220, 165, 1.6, 0.03, null, 0.16);
    noise(1.8, 'lowpass', 380, 0.7, 0.06);
  }

  // 成就解锁：清亮上行
  function achievement() {
    if (!ready || muted) return;
    [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => {
      tone('sine', f, f, 0.6, 0.05, null, i * 0.075);
      tone('triangle', f * 2, f * 2, 0.4, 0.014, null, i * 0.075);
    });
  }

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* ---------- 环境音 ---------- */
  function startAmbient() {
    if (!ready || ambientOn) return;
    ambientOn = true;
    const t = now();

    // 风
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    lp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.05, t + 2.5);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(musicBus);
    src.start(t); lfo.start(t);
    windNodes = { src, g, lfo };

    // 持续低音和弦
    chordOsc = [];
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = CHORDS[0][i];
      o.detune.value = (i - 1) * 6;
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 0.045 : 0.022;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 620;
      o.connect(f); f.connect(og); og.connect(musicBus);
      o.start(t);
      chordOsc.push({ o, g: og });
    }

    // 高空微光
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1318.5;
    const sg = ctx.createGain();
    sg.gain.value = 0.0001;
    sg.gain.exponentialRampToValueAtTime(0.006, t + 5);
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.11;
    const tremG = ctx.createGain();
    tremG.gain.value = 0.005;
    trem.connect(tremG); tremG.connect(sg.gain);
    shimmer.connect(sg); sg.connect(musicBus);
    shimmer.start(t); trem.start(t);
    chordOsc.push({ o: shimmer, g: sg });
    chordOsc.push({ o: trem, g: null });

    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(0.0001, t);
    musicBus.gain.exponentialRampToValueAtTime(1.0, t + 3.5);

    chordIndex = 0;
    ambientTimer = setInterval(() => {
      if (!ambientOn || !ready) return;
      chordIndex = (chordIndex + 1) % CHORDS.length;
      const tt = now();
      const chord = CHORDS[chordIndex];
      for (let i = 0; i < 3; i++) {
        chordOsc[i].o.frequency.cancelScheduledValues(tt);
        chordOsc[i].o.frequency.setTargetAtTime(chord[i], tt, 2.2);
      }
    }, 15000);
  }

  function stopAmbient() {
    stopCombatLoop();
    stopBossDrone();
    if (!ambientOn || !ready) return;
    ambientOn = false;
    if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
    const t = now();
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(0.0001, t, 0.6);
    const old = chordOsc.slice();
    const wind = windNodes;
    setTimeout(() => {
      old.forEach(n => { try { n.o.stop(); } catch (e) {} });
      if (wind) { try { wind.src.stop(); wind.lfo.stop(); } catch (e) {} }
    }, 2200);
    chordOsc = [];
    windNodes = null;
  }

  // 随夜幕加深，音乐略微增强
  function setIntensity(p) {
    if (!ready || !ambientOn) return;
    const t = now();
    musicBus.gain.setTargetAtTime(0.85 + p * 0.35, t, 1.5);
  }

  /* ---------- 动态战斗层 ---------- */
  function startCombatLoop() {
    if (combatTimer) return;
    combatTimer = setInterval(combatTick, 190);
  }
  function stopCombatLoop() {
    if (combatTimer) { clearInterval(combatTimer); combatTimer = null; }
    combatStep = 0;
  }

  function combatTick() {
    if (!ready || muted || !ambientOn) return;
    const lv = bossMusic ? Math.max(combatLevel, 0.78) : combatLevel;
    if (lv < 0.08) return;
    combatStep++;
    // 心跳般的低鼓
    if (combatStep % 4 === 1) tone('sine', 58, 34, 0.24, 0.05 * lv);
    // 军鼓噪声
    if (lv > 0.28 && combatStep % 2 === 0) {
      noise(0.07, 'bandpass', 1700 + lv * 900, 1.1, 0.015 * lv);
    }
    // 高音镲，仅高压时出现
    if (lv > 0.58 && combatStep % 4 === 3) {
      noise(0.12, 'highpass', 5200, 0.7, 0.012 * lv);
    }
    // Boss：每八拍一记闷响
    if (bossMusic && combatStep % 8 === 0) {
      tone('sawtooth', 41, 28, 0.7, 0.045);
    }
  }

  // 0..1，根据场上敌人数量与连击调节战斗强度
  function setCombatLevel(v) {
    combatLevel = clamp01(v);
    if (!ready || !ambientOn) return;
    if (combatLevel > 0.06 || bossMusic) startCombatLoop();
    else stopCombatLoop();
  }

  function startBossDrone() {
    if (bossDrone || !ready || !ambientOn) return;
    const t = now();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 1.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 340;
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = 77.78;
    o2.detune.value = 9;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(musicBus);
    o1.start(t); o2.start(t);
    bossDrone = { o1, o2, g };
  }

  function stopBossDrone() {
    if (!bossDrone) return;
    const d = bossDrone;
    bossDrone = null;
    const t = now();
    try {
      d.g.gain.cancelScheduledValues(t);
      d.g.gain.setTargetAtTime(0.0001, t, 0.35);
    } catch (e) {}
    setTimeout(() => { try { d.o1.stop(); d.o2.stop(); } catch (e) {} }, 1500);
  }

  function setBossMusic(on) {
    on = !!on;
    if (on === bossMusic) return;
    bossMusic = on;
    if (!ready || !ambientOn) return;
    if (on) { startCombatLoop(); startBossDrone(); }
    else { stopBossDrone(); if (combatLevel <= 0.06) stopCombatLoop(); }
  }

  function setMuted(m) {
    muted = m;
    if (master && ready) {
      master.gain.setTargetAtTime(m ? 0.0001 : Math.max(0.0001, volume), now(), 0.08);
    }
  }

  function isMuted() { return muted; }

  // 主音量 0..1
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master && ready) {
      master.gain.setTargetAtTime(muted ? 0.0001 : Math.max(0.0001, volume), now(), 0.05);
    }
  }

  function getVolume() { return volume; }

  return {
    init, resume, startAmbient, stopAmbient, setIntensity, setMuted, isMuted,
    setVolume, getVolume, setCombatLevel, setBossMusic,
    shot, hit, crit, kill, gem, heal, hurt, dash, shield, levelUp, select, hover,
    explosion, bossRoar, portal, victory, gameOver, heartbeat, warning, achievement
  };
})();
