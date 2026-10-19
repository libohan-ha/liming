/* =========================================================
   长夜将尽 · LAST LIGHT
   主游戏逻辑
   ========================================================= */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const ARENA_R = 1500;
  const CELL = 72;
  const MAX_PARTICLES = 1400;
  const MAX_GEMS = 320;

  /* ---------------- DOM ---------------- */
  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hudEl = $('hud');
  const startScreen = $('start-screen');
  const levelupScreen = $('levelup-screen');
  const pauseScreen = $('pause-screen');
  const endScreen = $('end-screen');
  const cardsEl = $('cards');
  const toastLayer = $('toast-layer');
  const fxHurt = $('fx-hurt');
  const fxFlash = $('fx-flash');
  const bossBar = $('boss-bar');
  const bossFill = $('boss-fill');
  const bossName = $('boss-name');
  const fxLowhp = $('fx-lowhp');
  const bossWarning = $('boss-warning');
  const bwName = $('bw-name');
  const weaponScreen = $('weapon-screen');
  const settingsScreen = $('settings-screen');
  const archiveScreen = $('archive-screen');
  const weaponListEl = $('weapon-list');

  /* ---------------- 常量 ---------------- */
  const MODES = {
    standard:  { key: 'standard',  label: '标准', duration: 1200, hp: 1.0,  dmg: 1.0, spawn: 1.0,  desc: '完整的长夜' },
    quick:     { key: 'quick',     label: '快速', duration: 480,  hp: 1.0,  dmg: 1.0, spawn: 1.18, desc: '浓缩的夜晚' },
    nightmare: { key: 'nightmare', label: '噩梦', duration: 1200, hp: 1.55, dmg: 1.35, spawn: 1.3, desc: '为老练者准备' }
  };

  const ENEMY_DEFS = {
    ghoul:   { r: 15, speed: 64,  hp: 14,   dmg: 7,  xp: 1,   sprite: 'ghoul' },
    stalker: { r: 11, speed: 132, hp: 9,    dmg: 5,  xp: 1,   sprite: 'stalker' },
    brute:   { r: 27, speed: 42,  hp: 125,  dmg: 15, xp: 4,   sprite: 'brute' },
    spitter: { r: 17, speed: 48,  hp: 40,   dmg: 8,  xp: 3,   sprite: 'spitter' },
    swarm:   { r: 7,  speed: 156, hp: 4.5,  dmg: 3.5,xp: 0.6, sprite: 'swarm' },
    wraith:  { r: 15, speed: 92,  hp: 30,   dmg: 9,  xp: 3,   sprite: 'wraith' },
    boss:    { r: 66, speed: 36,  hp: 1400, dmg: 30, xp: 60,  sprite: 'boss' }
  };

  const BOSS_NAMES = ['吞噬者', '夜母之影', '深渊守望', '黎明吞噬者'];

  /* ---------------- 武器 ---------------- */
  const WEAPON_ICONS = {
    pistol: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M8 20h40l6 6v10H30l-4 20H14l4-20H8Z"/><path d="M30 36h14"/><circle cx="46" cy="31" r="2.4"/><path d="M12 26h10" opacity=".55"/></svg>',
    shotgun: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 24h50v8H36l-3 8H20l3-8H5Z"/><path d="M40 32v14M33 39h14"/><path d="M48 24v-6M8 38h16" opacity=".55"/><circle cx="53" cy="28" r="2"/></svg>',
    repeater: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 30h34l8 6-8 6H10Z"/><path d="M22 42 18 56M34 42l4 14"/><path d="M18 30 12 16M44 30l8-12"/><path d="M18 20h12M40 20h12" opacity=".6"/><circle cx="40" cy="34" r="2.2"/></svg>'
  };

  const WEAPONS = {
    pistol: {
      key: 'pistol', name: '守夜人手枪', en: "WATCHMAN'S PISTOL",
      desc: '可靠、均衡，一发一发地把黑夜推回去。没有短板，也没有侥幸。',
      stats: [['伤害', '16'], ['射速', '0.36s'], ['穿透', '1'], ['生命', '120']],
      interval: 0.36, damage: 16, pierce: 1, projectiles: 1, spread: 0.06,
      bulletSpeed: 840, critChance: 0.05, maxHp: 120, speed: 240, recoil: 1, muzzle: 1
    },
    shotgun: {
      key: 'shotgun', name: '守夜人霰弹枪', en: "WATCHMAN'S SCATTERGUN",
      desc: '五颗弹丸铺开一道火墙。贴脸时无人能近身，远了就靠运气。',
      stats: [['伤害', '7×5'], ['射速', '0.66s'], ['穿透', '0'], ['生命', '138']],
      interval: 0.66, damage: 7, pierce: 0, projectiles: 5, spread: 0.20,
      bulletSpeed: 760, critChance: 0.04, maxHp: 138, speed: 232, recoil: 2.1, muzzle: 2
    },
    repeater: {
      key: 'repeater', name: '连发手弩', en: 'REPEATING CROSSBOW',
      desc: '轻、快、准。单发孱弱，但箭雨从不停歇，适合走位与手感。',
      stats: [['伤害', '9'], ['射速', '0.19s'], ['穿透', '0'], ['生命', '108']],
      interval: 0.19, damage: 9, pierce: 0, projectiles: 1, spread: 0.03,
      bulletSpeed: 980, critChance: 0.08, maxHp: 108, speed: 252, recoil: 0.55, muzzle: 0.7
    }
  };

  /* ---------------- 设置 ---------------- */
  const DEFAULT_SETTINGS = { volume: 0.55, shake: true, damageNumbers: true, reduceMotion: false, quality: 'auto' };
  let settings = loadSettings();
  let qualityLow = false;
  let autoQualityTimer = 0, autoQualityFrames = 0, autoQualityCooldown = 0;

  function loadSettings() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem('lastlight.settings') || 'null'); } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS, s || {});
  }
  function saveSettings() {
    try { localStorage.setItem('lastlight.settings', JSON.stringify(settings)); } catch (e) {}
  }

  /* ---------------- 成就 ---------------- */
  const ACHIEVEMENTS = [
    { id: 'first_blood', name: '第一滴血', desc: '在一场长夜中完成首次击杀' },
    { id: 'boss_slayer', name: '弑夜者', desc: '击败任意一场 Boss' },
    { id: 'survivor_5', name: '五分钟后', desc: '单场存活超过 5 分钟' },
    { id: 'dawn', name: '见到黎明', desc: '第一次活到天亮' },
    { id: 'kill_500', name: '五百人斩', desc: '累计击杀 500 个敌人' },
    { id: 'level_15', name: '深渊行者', desc: '单场达到 15 级' }
  ];

  const DEFAULT_META = { runs: 0, wins: 0, kills: 0, bestTime: 0, history: [], ach: {} };
  let meta = loadMeta();

  function loadMeta() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem('lastlight.meta') || 'null'); } catch (e) {}
    m = Object.assign({}, DEFAULT_META, m || {});
    if (!Array.isArray(m.history)) m.history = [];
    if (!m.ach || typeof m.ach !== 'object') m.ach = {};
    return m;
  }
  function saveMeta() {
    try { localStorage.setItem('lastlight.meta', JSON.stringify(meta)); } catch (e) {}
  }

  /* ---------------- 全局状态 ---------------- */
  let W = 0, H = 0, DPR = 1, zoom = 1;
  let state = 'menu';
  let game = null;
  let menuT = 0;
  let lastTime = 0;
  let groundPattern = null;
  let lightCv = null, lightCtx = null;
  let softCircle = null, softGlow = null;
  let fpsAcc = 0, fpsFrames = 0, fpsTimer = 0;
  let currentFps = 60;
  let autoLowStreak = 0, autoHighStreak = 0;
  let lastMode = 'standard';
  let lastWeapon = 'pistol';
  let selectedWeapon = 'pistol';
  let pendingMode = 'standard';
  let decorations = [];
  let fogBlobs = [];
  let embers = [];
  let menuCam = { x: 0, y: 0 };
  let hudTick = 0;
  let profU = 0, profR = 0, profN = 0;

  const input = {
    keys: Object.create(null),
    dashQueued: false
  };

  /* ---------------- 小工具 ---------------- */
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
  const fmtTime = s => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  };
  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    return a + d * t;
  }
  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
  function cellKey(x, y) {
    return (Math.floor(x / CELL) + 4096) * 8192 + (Math.floor(y / CELL) + 4096);
  }

  /* =========================================================
     初始化
     ========================================================= */
  function init() {
    Art.init();
    // 恢复持久化状态
    try {
      const w = localStorage.getItem('lastlight.weapon');
      if (w && WEAPONS[w]) lastWeapon = w;
      const m = localStorage.getItem('lastlight.muted');
      if (m === '1') AudioFX.setMuted(true);
    } catch (e) {}
    selectedWeapon = lastWeapon;

    resize();
    buildPatterns();
    buildMenuScene();
    bindInput();
    bindSettings();
    applySettings();
    renderWeaponList();
    renderArchive();
    syncMuteIcon();
    updateBestDisplay();
    requestAnimationFrame(loop);
  }

  function syncMuteIcon() {
    const m = AudioFX.isMuted();
    const w1 = $('mute-wave1'), w2 = $('mute-wave2');
    if (w1) w1.style.opacity = m ? 0.15 : 1;
    if (w2) w2.style.opacity = m ? 0.15 : 1;
  }

  function buildPatterns() {
    groundPattern = ctx.createPattern(Art.ground, 'repeat');
    // 柔和圆形（烟雾/光晕）
    softCircle = Art.makeCanvas(64, 64);
    let c = softCircle.getContext('2d');
    let g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(0.5, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);

    softGlow = Art.makeCanvas(128, 128);
    c = softGlow.getContext('2d');
    g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);

    lightCv = Art.makeCanvas(1, 1);
    lightCtx = lightCv.getContext('2d');
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(qualityLow ? 1.0 : 1.25, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    zoom = clamp(Math.min(W / 700, H / 390), 1.0, 2.2);
    if (lightCv) {
      lightCv.width = Math.max(2, Math.floor(W * 0.5));
      lightCv.height = Math.max(2, Math.floor(H * 0.5));
    }
  }

  /* =========================================================
     场景装饰
     ========================================================= */
  function generateDecorations(seed) {
    const rng = Art.mulberry32(seed || 12345);
    const out = [];
    const kinds = [
      { k: 'grave', w: 26 },
      { k: 'rock', w: 30 },
      { k: 'tree', w: 12 },
      { k: 'candle', w: 15 },
      { k: 'mushroom', w: 10 },
      { k: 'pillar', w: 7 }
    ];
    const totalW = kinds.reduce((a, b) => a + b.w, 0);
    for (let i = 0; i < 240; i++) {
      const a = rng() * TAU;
      const d = 210 + Math.sqrt(rng()) * (ARENA_R - 260);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      let r = rng() * totalW, kind = 'rock';
      for (const k of kinds) { r -= k.w; if (r <= 0) { kind = k.k; break; } }
      const arr = Art.deco[kind];
      const img = arr[Math.floor(rng() * arr.length)];
      const scale = kind === 'tree' ? rand(0.8, 1.35) : kind === 'pillar' ? rand(0.7, 1.1) : rand(0.7, 1.25);
      out.push({
        kind, x, y, img, scale,
        rot: kind === 'rock' || kind === 'grave' ? (rng() - 0.5) * 0.5 : 0,
        flicker: rng() * TAU,
        lightR: kind === 'candle' ? 150 : kind === 'mushroom' ? 70 : 0
      });
    }
    return out;
  }

  function buildMenuScene() {
    decorations = generateDecorations(777);
    fogBlobs = [];
    for (let i = 0; i < 14; i++) {
      fogBlobs.push({
        x: rand(-ARENA_R, ARENA_R), y: rand(-ARENA_R, ARENA_R),
        vx: rand(-7, 7), vy: rand(-4, 4),
        img: Art.fog[i % Art.fog.length],
        scale: rand(1.8, 3.8), alpha: rand(0.1, 0.24), phase: rand(0, TAU)
      });
    }
    embers = [];
    for (let i = 0; i < 80; i++) embers.push(newEmber(true));
  }

  function newEmber(anywhere) {
    const x = menuCam.x + rand(-W / zoom / 2 - 80, W / zoom / 2 + 80);
    const y = menuCam.y + rand(-H / zoom / 2 - 80, H / zoom / 2 + 80);
    return {
      x, y,
      vx: rand(-9, 9), vy: rand(-26, -9),
      size: rand(0.7, 2.1),
      life: anywhere ? rand(1, 8) : rand(4, 9),
      maxLife: 9,
      hue: rand(0, 1)
    };
  }

  /* =========================================================
     游戏对象
     ========================================================= */
  function makePlayer(weaponKey) {
    const w = WEAPONS[weaponKey] || WEAPONS.pistol;
    return {
      x: 0, y: 0, vx: 0, vy: 0, r: 15,
      hp: w.maxHp, maxHp: w.maxHp,
      baseSpeed: w.speed, speedMult: 1,
      baseInterval: w.interval, fireRateMult: 1,
      baseDamage: w.damage, damageMult: 1,
      pierce: w.pierce, projectiles: w.projectiles, spread: w.spread,
      critChance: w.critChance, critMult: 2.0,
      bulletSpeed: w.bulletSpeed, bulletSpeedMult: 1, bulletSizeMult: 1,
      weapon: w.key, weaponName: w.name,
      recoilPower: w.recoil, muzzlePower: w.muzzle,
      pickupMult: 1, xpMult: 1,
      lifesteal: 0, regen: 0.35,
      burnLevel: 0, freezeLevel: 0, chainLevel: 0, explodeLevel: 0,
      orbLevel: 0, auraLevel: 0, dashLevel: 0,
      dashCdMult: 1, luck: 0, revives: 0,
      upgrades: {},
      aim: 0,
      fireTimer: 0.25, recoil: 0, muzzle: 0,
      dashT: 0, dashCd: 0, dashCdMax: 2.4,
      dashDirX: 0, dashDirY: 0,
      invuln: 0, walkPhase: 0, lanternPhase: 0,
      afterimages: [],
      dead: false,
      hurtFlash: 0,
      hasTarget: false
    };
  }

  function makeGame(modeKey, weaponKey) {
    const mode = MODES[modeKey] || MODES.standard;
    const w = WEAPONS[weaponKey] || WEAPONS.pistol;
    const g = {
      modeKey, mode, weapon: w.key, weaponName: w.name,
      duration: mode.duration,
      t: 0,
      player: makePlayer(w.key),
      enemies: [],
      bullets: [],
      ebullets: [],
      gems: [],
      pickups: [],
      particles: [],
      decals: [],
      texts: [],
      lights: [],
      spawnTimer: 1.6,
      bossIndex: 0,
      bossTimes: [0.24, 0.5, 0.75, 0.93].map(f => f * mode.duration),
      boss: null,
      kills: 0,
      damageDealt: 0,
      level: 1,
      xp: 0,
      xpNext: xpForLevel(1),
      rerolls: 2,
      pendingLevels: 0,
      levelupDelay: 0,
      offers: [],
      trauma: 0,
      hitStop: 0,
      slowmo: 0,
      combo: 0,
      comboT: 0,
      endT: 0,
      endWin: false,
      dashFlash: 0,
      grid: new Map(),
      camera: { x: 0, y: 0 },
      decor: generateDecorations(20261019 + Math.floor(Math.random() * 9999)),
      stats: { shots: 0, hits: 0 },
      bossKills: 0,
      bossWarn: null,
      heartbeatT: 0,
      lowHpT: 0
    };
    g.camera.x = 0; g.camera.y = 0;
    return g;
  }

  function xpForLevel(l) {
    return Math.floor(7 + l * 4 + Math.pow(l, 1.5) * 1.25);
  }

  /* =========================================================
     开始 / 结束
     ========================================================= */
  function startGame(modeKey, weaponKey) {
    modeKey = modeKey || lastMode;
    weaponKey = (weaponKey && WEAPONS[weaponKey]) ? weaponKey : lastWeapon;
    lastMode = modeKey;
    lastWeapon = weaponKey;
    selectedWeapon = weaponKey;
    try { localStorage.setItem('lastlight.weapon', weaponKey); } catch (e) {}

    AudioFX.init();
    AudioFX.resume();
    AudioFX.setVolume(settings.volume);
    AudioFX.startAmbient();
    AudioFX.setMuted(AudioFX.isMuted());

    game = makeGame(modeKey, weaponKey);
    state = 'playing';
    hideAllScreens();
    hudEl.classList.remove('hidden');
    bossBar.classList.add('hidden');
    bossWarning.classList.remove('show');
    fxLowhp.classList.remove('on');
    document.body.classList.remove('debug');
    if (location.search.indexOf('debug') >= 0) document.body.classList.add('debug');

    const wEl = $('hud-weapon');
    if (wEl) wEl.textContent = game.weaponName;

    game.player.x = 0;
    game.player.y = 0;
    game.camera.x = 0;
    game.camera.y = 0;
    lastTime = performance.now();
    toast('活到黎明');
    updateHud(true);
  }

  function hideAllScreens() {
    [startScreen, levelupScreen, pauseScreen, endScreen, weaponScreen, settingsScreen, archiveScreen]
      .forEach(s => { if (s) s.classList.add('hidden'); });
  }

  function goMenu() {
    state = 'menu';
    game = null;
    hideAllScreens();
    startScreen.classList.remove('hidden');
    hudEl.classList.add('hidden');
    bossBar.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    bossWarning.classList.remove('show');
    fxLowhp.classList.remove('on');
    updateBestDisplay();
    renderArchive();
    menuT = 0;
  }

  function beginEnd(win) {
    if (state === 'ending' || state === 'over') return;
    state = 'ending';
    game.endWin = win;
    game.endT = 0;
    game.slowmo = win ? 1.2 : 0.8;
    if (win) {
      AudioFX.victory();
      toast('黎明降临');
      game.lights.push({ x: game.player.x, y: game.player.y, r: 900, life: 3, maxLife: 3, color: '#ffd9a0' });
    } else {
      AudioFX.gameOver();
    }
  }

  function showEndScreen(win) {
    state = 'over';
    AudioFX.stopAmbient();
    hudEl.classList.add('hidden');
    bossBar.classList.add('hidden');
    const p = game.player;
    const survived = win ? game.duration : game.t;
    $('end-title').textContent = win ? '黎明降临' : '你倒在了黎明前';
    $('end-eyebrow').textContent = win ? 'DAWN BREAKS' : 'THE NIGHT CLAIMS YOU';
    $('end-sub').textContent = win ? '你活过了这个夜晚，第一缕光落在肩上' : '夜色吞没了最后一缕微光';
    $('end-time').textContent = fmtTime(survived);
    $('end-kills').textContent = fmtNum(game.kills);
    $('end-level').textContent = game.level;
    $('end-damage').textContent = fmtNum(game.damageDealt);
    endScreen.classList.toggle('win', win);

    const isNew = saveBest(win, survived);
    $('end-new').style.display = isNew ? 'block' : 'none';
    fxLowhp.classList.remove('on');
    bossWarning.classList.remove('show');
    recordRun(win, survived);
    endScreen.classList.remove('hidden');
  }

  function saveBest(win, survived) {
    let best = null;
    try { best = JSON.parse(localStorage.getItem('lastlight.best') || 'null'); } catch (e) {}
    const cur = { win, time: Math.round(survived), kills: game.kills, level: game.level, mode: game.modeKey };
    let isNew = false;
    if (!best) isNew = true;
    else if (win && !best.win) isNew = true;
    else if (win === best.win) {
      if (cur.time > best.time) isNew = true;
      else if (cur.time === best.time && cur.kills > best.kills) isNew = true;
    }
    if (isNew) {
      try { localStorage.setItem('lastlight.best', JSON.stringify(cur)); } catch (e) {}
    }
    return isNew;
  }

  function updateBestDisplay() {
    let best = null;
    try { best = JSON.parse(localStorage.getItem('lastlight.best') || 'null'); } catch (e) {}
    const el = $('best-record');
    if (!el) return;
    if (!best) { el.textContent = '—'; return; }
    el.textContent = (best.win ? '黎明 · ' : '') + fmtTime(best.time) + ' · ' + best.kills + ' 击杀';
  }

  /* =========================================================
     档案 / 成就
     ========================================================= */
  function unlockAch(id, silent) {
    if (meta.ach[id]) return false;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return false;
    meta.ach[id] = Date.now();
    saveMeta();
    if (!silent) {
      if (state === 'playing' || state === 'levelup' || state === 'paused') {
        toast('成就 · ' + a.name);
        AudioFX.achievement();
      }
    }
    return true;
  }

  function recordRun(win, survived) {
    const run = {
      at: Date.now(),
      mode: game.modeKey,
      weapon: game.weapon,
      win: !!win,
      time: Math.round(survived),
      kills: game.kills,
      level: game.level
    };
    meta.runs += 1;
    meta.kills += game.kills;
    if (win) meta.wins += 1;
    if (run.time > meta.bestTime) meta.bestTime = run.time;
    meta.history.unshift(run);
    if (meta.history.length > 20) meta.history.length = 20;
    saveMeta();

    if (win) unlockAch('dawn', true);
    if (survived >= 300) unlockAch('survivor_5', true);
    if (game.level >= 15) unlockAch('level_15', true);
    if (game.bossKills > 0) unlockAch('boss_slayer', true);
    if (meta.kills >= 500) unlockAch('kill_500', true);
    renderArchive();
  }

  function renderArchive() {
    const runs = $('arc-runs'), kills = $('arc-kills'), wins = $('arc-wins'), best = $('arc-best');
    if (!runs) return;
    runs.textContent = meta.runs;
    kills.textContent = fmtNum(meta.kills);
    wins.textContent = meta.wins;
    best.textContent = meta.bestTime > 0 ? fmtTime(meta.bestTime) : '—';

    const list = $('ach-list');
    if (!list) return;
    list.innerHTML = ACHIEVEMENTS.map(a => {
      const on = !!meta.ach[a.id];
      return '<div class="ach-item' + (on ? ' unlocked' : '') + '">' +
        '<span class="ach-dot"></span>' +
        '<div><div class="ach-name">' + a.name + '</div>' +
        '<div class="ach-desc">' + a.desc + '</div></div></div>';
    }).join('');
  }

  /* =========================================================
     设置
     ========================================================= */
  function applySettings() {
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    AudioFX.setVolume(settings.volume);
    if (settings.quality === 'low') setQualityLow(true, false);
    else if (settings.quality === 'high') setQualityLow(false, false);
    else { qualityLow = false; resize(); }
    syncSettingsUI();
  }

  function syncSettingsUI() {
    const vol = $('set-volume');
    if (vol) { vol.value = Math.round(settings.volume * 100); }
    const volVal = $('set-volume-val');
    if (volVal) volVal.textContent = Math.round(settings.volume * 100);
    toggleEl($('set-shake'), settings.shake);
    toggleEl($('set-damage'), settings.damageNumbers);
    toggleEl($('set-motion'), settings.reduceMotion);
    document.querySelectorAll('#set-quality button').forEach(b => {
      b.classList.toggle('on', b.dataset.q === settings.quality);
    });
  }

  function toggleEl(el, on) {
    if (!el) return;
    el.classList.toggle('on', !!on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function setQualityLow(low, persist) {
    qualityLow = !!low;
    resize();
    if (persist) {
      settings.quality = low ? 'low' : 'high';
      saveSettings();
      syncSettingsUI();
    }
  }

  function openSettings() {
    AudioFX.init(); AudioFX.resume();
    AudioFX.hover();
    syncSettingsUI();
    settingsScreen.classList.remove('hidden');
  }

  function closeSettings() {
    settingsScreen.classList.add('hidden');
    AudioFX.select();
  }

  function bindSettings() {
    const vol = $('set-volume');
    if (vol) {
      vol.addEventListener('input', () => {
        settings.volume = clamp(parseInt(vol.value, 10) / 100, 0, 1);
        $('set-volume-val').textContent = Math.round(settings.volume * 100);
        AudioFX.setVolume(settings.volume);
        saveSettings();
      });
    }

    const shake = $('set-shake');
    if (shake) shake.addEventListener('click', () => {
      settings.shake = !settings.shake;
      toggleEl(shake, settings.shake);
      saveSettings();
      AudioFX.hover();
    });

    const dmg = $('set-damage');
    if (dmg) dmg.addEventListener('click', () => {
      settings.damageNumbers = !settings.damageNumbers;
      toggleEl(dmg, settings.damageNumbers);
      saveSettings();
      AudioFX.hover();
    });

    const motion = $('set-motion');
    if (motion) motion.addEventListener('click', () => {
      settings.reduceMotion = !settings.reduceMotion;
      document.body.classList.toggle('reduce-motion', settings.reduceMotion);
      toggleEl(motion, settings.reduceMotion);
      saveSettings();
      AudioFX.hover();
    });

    document.querySelectorAll('#set-quality button').forEach(b => {
      b.addEventListener('click', () => {
        settings.quality = b.dataset.q;
        if (settings.quality === 'low') setQualityLow(true, false);
        else if (settings.quality === 'high') setQualityLow(false, false);
        else { qualityLow = false; resize(); }
        saveSettings();
        syncSettingsUI();
        AudioFX.hover();
      });
    });

    const openS = $('btn-settings-menu');
    if (openS) openS.addEventListener('click', openSettings);
    const openSP = $('btn-settings-pause');
    if (openSP) openSP.addEventListener('click', openSettings);
    const closeS = $('btn-settings-close');
    if (closeS) closeS.addEventListener('click', closeSettings);

    const openA = $('btn-archive-menu');
    if (openA) openA.addEventListener('click', () => {
      AudioFX.init(); AudioFX.resume();
      AudioFX.hover();
      renderArchive();
      archiveScreen.classList.remove('hidden');
    });
    const closeA = $('btn-archive-close');
    if (closeA) closeA.addEventListener('click', () => {
      archiveScreen.classList.add('hidden');
      AudioFX.select();
    });
  }

  /* =========================================================
     武器选择
     ========================================================= */
  function renderWeaponList() {
    if (!weaponListEl) return;
    weaponListEl.innerHTML = Object.keys(WEAPONS).map(key => {
      const w = WEAPONS[key];
      const sel = key === selectedWeapon ? ' selected' : '';
      const stats = w.stats.map(s => '<div class="weapon-stat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>').join('');
      return '<button class="weapon-card' + sel + '" data-weapon="' + key + '">' +
        '<div class="weapon-icon">' + WEAPON_ICONS[key] + '</div>' +
        '<div class="weapon-name">' + w.name + '</div>' +
        '<div class="weapon-en">' + w.en + '</div>' +
        '<div class="weapon-desc">' + w.desc + '</div>' +
        '<div class="weapon-stats">' + stats + '</div>' +
        '</button>';
    }).join('');

    weaponListEl.querySelectorAll('.weapon-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedWeapon = card.dataset.weapon;
        lastWeapon = selectedWeapon;
        try { localStorage.setItem('lastlight.weapon', selectedWeapon); } catch (e) {}
        weaponListEl.querySelectorAll('.weapon-card').forEach(c => c.classList.toggle('selected', c === card));
        AudioFX.init(); AudioFX.resume(); AudioFX.hover();
      });
      card.addEventListener('dblclick', () => {
        startGame(pendingMode, selectedWeapon);
      });
    });
  }

  function openWeaponSelect(modeKey) {
    pendingMode = modeKey || 'standard';
    selectedWeapon = lastWeapon;
    renderWeaponList();
    hideAllScreens();
    weaponScreen.classList.remove('hidden');
    startScreen.classList.add('hidden');
    hudEl.classList.add('hidden');
    AudioFX.init(); AudioFX.resume(); AudioFX.hover();
  }

  function closeWeaponSelect() {
    weaponScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    AudioFX.select();
  }

  /* =========================================================
     输入
     ========================================================= */
  function bindInput() {
    window.addEventListener('keydown', e => {
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(code) >= 0) e.preventDefault();

      if (code === 'KeyM') { toggleMute(); return; }

      if (state === 'levelup') {
        if (code === 'Digit1' || code === 'Numpad1') chooseOffer(0);
        if (code === 'Digit2' || code === 'Numpad2') chooseOffer(1);
        if (code === 'Digit3' || code === 'Numpad3') chooseOffer(2);
        return;
      }

      if (code === 'Escape') {
        if (settingsScreen && !settingsScreen.classList.contains('hidden')) { closeSettings(); return; }
        if (archiveScreen && !archiveScreen.classList.contains('hidden')) { archiveScreen.classList.add('hidden'); AudioFX.select(); return; }
        if (weaponScreen && !weaponScreen.classList.contains('hidden')) { closeWeaponSelect(); return; }
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (state === 'playing' || state === 'paused') togglePause();
        return;
      }

      if (state === 'playing') {
        input.keys[code] = true;
        if (code === 'Space' && !e.repeat) input.dashQueued = true;
      }
    });

    window.addEventListener('keyup', e => {
      input.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      input.keys = Object.create(null);
      if (state === 'playing') togglePause();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state === 'playing') togglePause();
    });

    window.addEventListener('resize', () => {
      resize();
    });

    // 开始界面 → 武器选择
    document.querySelectorAll('.mode-card').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioFX.init(); AudioFX.resume();
        AudioFX.hover();
        openWeaponSelect(btn.dataset.mode);
      });
    });

    const wStart = $('btn-weapon-start');
    if (wStart) wStart.addEventListener('click', () => {
      AudioFX.select();
      startGame(pendingMode, selectedWeapon);
    });
    const wBack = $('btn-weapon-back');
    if (wBack) wBack.addEventListener('click', closeWeaponSelect);

    // 暂停
    $('btn-resume').addEventListener('click', () => togglePause());
    $('btn-restart').addEventListener('click', () => { AudioFX.select(); startGame(lastMode, lastWeapon); });
    $('btn-menu').addEventListener('click', () => { AudioFX.select(); goMenu(); });

    // 结算
    $('btn-again').addEventListener('click', () => { AudioFX.select(); startGame(lastMode, lastWeapon); });
    $('btn-end-menu').addEventListener('click', () => { AudioFX.select(); goMenu(); });

    // 重掷
    $('reroll').addEventListener('click', () => {
      if (state !== 'levelup' || game.rerolls <= 0) return;
      game.rerolls--;
      AudioFX.select();
      const oldKey = game.offers.map(o => o.id).join(',');
      for (let i = 0; i < 4; i++) {
        game.offers = Upgrades.roll(game.player, 3);
        if (game.offers.map(o => o.id).join(',') !== oldKey) break;
      }
      renderOffers();
    });

    // 静音
    $('mute-btn').addEventListener('click', toggleMute);

    // 防止右键菜单
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      pauseScreen.classList.remove('hidden');
      $('pause-time').textContent = fmtTime(game.t);
      $('pause-kills').textContent = game.kills;
      $('pause-level').textContent = game.level;
      AudioFX.hover();
    } else if (state === 'paused') {
      state = 'playing';
      pauseScreen.classList.add('hidden');
      lastTime = performance.now();
      AudioFX.hover();
    }
  }

  function toggleMute() {
    AudioFX.init();
    const m = !AudioFX.isMuted();
    AudioFX.setMuted(m);
    AudioFX.setVolume(settings.volume);
    try { localStorage.setItem('lastlight.muted', m ? '1' : '0'); } catch (e) {}
    syncMuteIcon();
  }

  function updateLowHp(dt) {
    const g = game, p = g.player;
    const ratio = p.maxHp > 0 ? p.hp / p.maxHp : 0;
    const low = !p.dead && ratio < 0.3;
    if (fxLowhp) fxLowhp.classList.toggle('on', low);
    if (!low) { g.heartbeatT = 0; return; }
    g.heartbeatT -= dt;
    if (g.heartbeatT <= 0) {
      const k = clamp(1 - ratio / 0.3, 0, 1);
      g.heartbeatT = lerp(1.15, 0.55, k);
      AudioFX.heartbeat(0.45 + k * 0.55);
      if (settings.shake) g.trauma = Math.min(1, g.trauma + 0.02);
    }
  }

  function shakeAmount(g) {
    if (!settings.shake) return 0;
    const k = settings.reduceMotion ? 0.22 : 1;
    return g.trauma * g.trauma * 20 * k;
  }

  // 自动画质：连续低帧降档，连续高帧回升
  function updateAutoQuality() {
    if (settings.quality !== 'auto' || state !== 'playing') return;
    if (currentFps < 46) { autoLowStreak++; autoHighStreak = 0; }
    else if (currentFps > 57) { autoHighStreak++; autoLowStreak = 0; }
    else { autoLowStreak = 0; autoHighStreak = 0; }
    if (!qualityLow && autoLowStreak >= 4) {
      qualityLow = true; autoLowStreak = 0; autoHighStreak = 0; resize();
    } else if (qualityLow && autoHighStreak >= 8) {
      qualityLow = false; autoHighStreak = 0; autoLowStreak = 0; resize();
    }
  }

  /* =========================================================
     主循环
     ========================================================= */
  function loop(now) {
    requestAnimationFrame(loop);
    if (!lastTime) lastTime = now;
    let dtReal = (now - lastTime) / 1000;
    lastTime = now;
    if (!isFinite(dtReal) || dtReal < 0) dtReal = 0;
    dtReal = Math.min(0.05, dtReal);

    // FPS
    fpsFrames++;
    fpsTimer += dtReal;
    if (fpsTimer >= 0.5) {
      currentFps = Math.round(fpsFrames / fpsTimer);
      const el = $('fps');
      if (el) el.textContent = currentFps + ' FPS · ' + (game ? game.enemies.length : 0) + 'E' + (qualityLow ? ' · LOW' : '');
      fpsFrames = 0; fpsTimer = 0;
      updateAutoQuality();
    }

    if (state === 'menu') {
      menuT += dtReal;
      updateMenu(dtReal);
      renderMenu(dtReal);
      return;
    }

    if (!game) return;

    const tA = performance.now();
    if (state === 'playing') {
      let dt = dtReal;
      if (game.slowmo > 0) { game.slowmo -= dtReal; dt *= 0.28; }
      if (game.hitStop > 0) { game.hitStop -= dtReal; dt *= 0.12; }
      update(dt, dtReal);
    } else if (state === 'ending') {
      game.endT += dtReal;
      updateEffects(dtReal);
      updateEnding(dtReal);
    } else if (state === 'over') {
      updateEffects(dtReal * 0.5);
    }
    const tB = performance.now();
    render(dtReal);
    const tC = performance.now();
    updateHud(false);

    profU += tB - tA; profR += tC - tB; profN++;
    if (profN >= 40) {
      window.__prof = { u: +(profU / profN).toFixed(2), r: +(profR / profN).toFixed(2) };
      profU = 0; profR = 0; profN = 0;
    }
  }

  /* =========================================================
     更新
     ========================================================= */
  function update(dt, dtReal) {
    const g = game;
    const p = g.player;
    g.t += dt;

    if (g.t >= 300) unlockAch('survivor_5');
    updateLowHp(dt);

    if (g.t >= g.duration) {
      beginEnd(true);
      return;
    }

    // 连击衰减
    if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }

    updatePlayer(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    g.grid = buildGrid();
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateGems(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateLights(dt);
    updateEffects(dt);
    updateCamera(dt);

    // 准星/危险提示等
    g.trauma = Math.max(0, g.trauma - dtReal * 1.35);
    g.hitStop = Math.max(0, g.hitStop - dtReal);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dtReal * 4);
    p.muzzle = Math.max(0, p.muzzle - dtReal);
    p.recoil = Math.max(0, p.recoil - dtReal * 14);
    p.dashT = Math.max(0, p.dashT - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    g.dashFlash = Math.max(0, g.dashFlash - dtReal * 3);

    // 再生
    if (p.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    // 升级队列
    g.levelupDelay = Math.max(0, g.levelupDelay - dtReal);
    if (g.pendingLevels > 0 && g.levelupDelay <= 0 && state === 'playing') openLevelUp();
  }

  function updateEffects(dt) {
    const g = game;
    if (!g) return;
    g.trauma = Math.max(0, g.trauma - dt * 1.2);
    updateParticles(dt);
    updateLights(dt);
    updateCamera(dt);
  }

  function updateCamera(dt) {
    const g = game;
    const p = g.player;
    const tx = p.x, ty = p.y;
    g.camera.x = lerp(g.camera.x, tx, Math.min(1, dt * 6.5));
    g.camera.y = lerp(g.camera.y, ty, Math.min(1, dt * 6.5));
    const halfW = W / (2 * zoom), halfH = H / (2 * zoom);
    if (ARENA_R * 2 > W / zoom) g.camera.x = clamp(g.camera.x, -ARENA_R + halfW, ARENA_R - halfW);
    else g.camera.x = 0;
    if (ARENA_R * 2 > H / zoom) g.camera.y = clamp(g.camera.y, -ARENA_R + halfH, ARENA_R - halfH);
    else g.camera.y = 0;
  }

  /* ---------------- 玩家 ---------------- */
  function updatePlayer(dt) {
    const g = game, p = g.player;

    // 移动输入
    let mx = 0, my = 0;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const l = Math.hypot(mx, my);
      mx /= l; my /= l;
    }

    // 冲刺
    if (input.dashQueued) {
      input.dashQueued = false;
      if (p.dashCd <= 0 && p.dashT <= 0 && !p.dead) tryDash(mx, my);
    }

    if (p.dashT > 0) {
      const sp = 1000;
      p.x += p.dashDirX * sp * dt;
      p.y += p.dashDirY * sp * dt;
      p.vx = p.dashDirX * sp;
      p.vy = p.dashDirY * sp;
      // 残影
      if (Math.random() < 0.7) {
        p.afterimages.push({ x: p.x, y: p.y, a: p.aim, life: 0.28, max: 0.28 });
      }
      if (Math.random() < 0.8) {
        addParticle({
          type: 'dot', x: p.x + rand(-8, 8), y: p.y + rand(-8, 8),
          vx: -p.dashDirX * rand(30, 110), vy: -p.dashDirY * rand(30, 110),
          life: 0.4, max: 0.4, size: rand(1.5, 3.5), color: '#a8dcff', add: true
        });
      }
    } else {
      const sp = p.baseSpeed * p.speedMult;
      const tx = mx * sp, ty = my * sp;
      const accel = Math.min(1, dt * 16);
      p.vx = lerp(p.vx, tx, accel);
      p.vy = lerp(p.vy, ty, accel);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (moving) p.walkPhase += dt * 11;
    }

    // 边界
    const d = Math.hypot(p.x, p.y);
    const maxD = ARENA_R - 46;
    if (d > maxD) {
      p.x = p.x / d * maxD;
      p.y = p.y / d * maxD;
    }

    // 残影衰减
    for (let i = p.afterimages.length - 1; i >= 0; i--) {
      p.afterimages[i].life -= dt;
      if (p.afterimages[i].life <= 0) p.afterimages.splice(i, 1);
    }

    // 瞄准：最近敌人
    let best = null, bestD = Infinity;
    const range2 = 640 * 640;
    for (const e of g.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if (d2 > range2) continue;
      if (d2 < bestD) { bestD = d2; best = e; }
    }
    if (g.boss && !g.boss.dead) best = g.boss;
    p.hasTarget = !!best;
    if (best) {
      const targetA = Math.atan2(best.y - p.y, best.x - p.x);
      p.aim = angleLerp(p.aim, targetA, Math.min(1, dt * 14));
    } else if (moving) {
      p.aim = angleLerp(p.aim, Math.atan2(my, mx), Math.min(1, dt * 8));
    }

    // 射击
    const interval = p.baseInterval / p.fireRateMult;
    p.fireTimer -= dt;
    if (p.hasTarget && p.fireTimer <= 0 && !p.dead) {
      p.fireTimer = interval;
      fire();
    }

    // 环绕光球
    updateOrbs(dt);
    // 荆棘光环
    updateAura(dt);
    // 灯笼摆动
    p.lanternPhase += dt * 2.2;
  }

  function tryDash(mx, my) {
    const g = game, p = g.player;
    let dx = mx, dy = my;
    if (dx === 0 && dy === 0) { dx = Math.cos(p.aim); dy = Math.sin(p.aim); }
    const l = Math.hypot(dx, dy) || 1;
    p.dashDirX = dx / l;
    p.dashDirY = dy / l;
    p.dashT = 0.16;
    p.dashCd = p.dashCdMax * p.dashCdMult;
    p.invuln = Math.max(p.invuln, 0.34);
    p.afterimages.push({ x: p.x, y: p.y, a: p.aim, life: 0.3, max: 0.3 });
    g.trauma = Math.min(1, g.trauma + 0.16);
    AudioFX.dash();
    for (let i = 0; i < 14; i++) {
      addParticle({
        type: 'dot', x: p.x, y: p.y,
        vx: -p.dashDirX * rand(60, 220) + rand(-60, 60),
        vy: -p.dashDirY * rand(60, 220) + rand(-60, 60),
        life: rand(0.2, 0.5), max: 0.5, size: rand(1, 3),
        color: '#a8dcff', add: true
      });
    }
    if (p.dashLevel > 0) {
      const dmg = 35 + p.dashLevel * 25;
      explodeAt(p.x, p.y, 92, dmg, '#a8dcff');
    }
  }

  function updateOrbs(dt) {
    const g = game, p = g.player;
    if (p.orbLevel <= 0) return;
    const count = p.orbLevel;
    const orbitR = 88 + p.orbLevel * 5;
    const speed = 2.1;
    const base = g.t * speed;
    const dmg = 12 + p.orbLevel * 9;
    for (let i = 0; i < count; i++) {
      const a = base + i * TAU / count;
      const ox = p.x + Math.cos(a) * orbitR;
      const oy = p.y + Math.sin(a) * orbitR;
      for (const e of g.enemies) {
        if (e.dead || e.spawnT > 0) continue;
        if (e.orbCd > 0) continue;
        if (dist2(ox, oy, e.x, e.y) < (e.r + 13) * (e.r + 13)) {
          e.orbCd = 0.32;
          damageEnemy(e, dmg, { crit: false, color: '#8ce8ff' });
          const ang = Math.atan2(e.y - oy, e.x - ox);
          e.x += Math.cos(ang) * 10;
          e.y += Math.sin(ang) * 10;
          for (let k = 0; k < 6; k++) {
            addParticle({
              type: 'dot', x: ox, y: oy,
              vx: Math.cos(ang) * rand(30, 130) + rand(-50, 50),
              vy: Math.sin(ang) * rand(30, 130) + rand(-50, 50),
              life: rand(0.2, 0.45), max: 0.45, size: rand(1, 2.6),
              color: '#8ce8ff', add: true
            });
          }
          break;
        }
      }
    }
  }

  function updateAura(dt) {
    const g = game, p = g.player;
    if (p.auraLevel <= 0) return;
    p.auraTick = (p.auraTick || 0) - dt;
    if (p.auraTick > 0) return;
    p.auraTick = 0.28;
    const radius = 90 + p.auraLevel * 16;
    const dmg = 7 * p.auraLevel * 0.28;
    for (const e of g.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      if (dist2(p.x, p.y, e.x, e.y) < (radius + e.r) * (radius + e.r)) {
        damageEnemy(e, dmg, { dot: true, color: '#9cffc4' });
      }
    }
  }

  function fire() {
    const g = game, p = g.player;
    const count = p.projectiles;
    const spread = p.spread;
    const dmg = p.baseDamage * p.damageMult;
    const speed = p.bulletSpeed * p.bulletSpeedMult;
    const size = 4.2 * p.bulletSizeMult;
    const baseA = p.aim;
    const originX = p.x + Math.cos(baseA) * 24;
    const originY = p.y + Math.sin(baseA) * 24;

    for (let i = 0; i < count; i++) {
      const off = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const a = baseA + off + rand(-0.012, 0.012);
      g.bullets.push({
        x: originX, y: originY,
        px: originX, py: originY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: size,
        damage: dmg,
        pierce: p.pierce,
        life: 1.25,
        angle: a,
        hit: [],
        trail: []
      });
    }

    const wpn = WEAPONS[p.weapon] || WEAPONS.pistol;
    p.recoil = wpn.recoil;
    p.muzzle = 0.06 * wpn.muzzle;
    g.stats.shots += count;
    AudioFX.shot(0);
    g.trauma = Math.min(1, g.trauma + 0.02 + 0.014 * wpn.recoil);

    // 枪口粒子
    for (let i = 0; i < 5 * wpn.muzzle; i++) {
      const a = baseA + rand(-0.5, 0.5);
      addParticle({
        type: 'dot', x: originX, y: originY,
        vx: Math.cos(a) * rand(80, 280), vy: Math.sin(a) * rand(80, 280),
        life: rand(0.06, 0.2), max: 0.2, size: rand(1, 2.6),
        color: '#ffe0a0', add: true
      });
    }
    // 抛壳
    addParticle({
      type: 'shard', x: p.x, y: p.y,
      vx: Math.cos(baseA + Math.PI / 2) * rand(40, 90),
      vy: Math.sin(baseA + Math.PI / 2) * rand(40, 90),
      life: 0.6, max: 0.6, size: 2.2, rot: rand(0, TAU), vr: rand(-12, 12),
      color: '#c9a86a', add: false, grav: 260
    });
    g.lights.push({ x: originX, y: originY, r: 120, life: 0.09, maxLife: 0.09, color: '#ffcf80' });
  }

  /* ---------------- 敌人生成 ---------------- */
  function updateSpawning(dt) {
    const g = game;
    const p = g.player;
    const prog = g.t / g.duration;

    // Boss：先预警 3 秒，再真正降临
    if (g.bossWarn) {
      g.bossWarn.t -= dt;
      if (g.bossWarn.t <= 0) {
        const idx = g.bossWarn.index;
        g.bossWarn = null;
        spawnBoss(idx);
        g.bossIndex++;
      }
    } else if (g.bossIndex < g.bossTimes.length && g.t >= g.bossTimes[g.bossIndex] && !g.boss) {
      warnBoss(g.bossIndex);
    }

    if (g.boss && !g.boss.dead) return;

    g.spawnTimer -= dt;
    if (g.spawnTimer > 0) return;

    const base = lerp(2.0, 0.55, prog) / g.mode.spawn;
    g.spawnTimer = base * rand(0.72, 1.28);

    if (g.enemies.length >= 320) return;

    const groupN = 1 + Math.floor(rand(0, 1 + prog * 1.9));
    const type = pickEnemyType(prog);
    if (type === 'swarm') {
      const n = randInt(6, 9);
      for (let i = 0; i < n; i++) spawnAtEdge('swarm', 0.9);
    } else {
      for (let i = 0; i < groupN; i++) spawnAtEdge(type, 1);
    }
  }

  function pickEnemyType(prog) {
    const table = [
      ['ghoul', 40],
      ['stalker', 16 + prog * 12],
      ['swarm', 7 + prog * 5],
      ['spitter', prog > 0.1 ? 8 + prog * 8 : 0],
      ['brute', prog > 0.2 ? 7 + prog * 12 : 0],
      ['wraith', prog > 0.35 ? 4 + prog * 12 : 0]
    ];
    let total = 0;
    for (const t of table) total += t[1];
    let r = Math.random() * total;
    for (const t of table) { r -= t[1]; if (r <= 0) return t[0]; }
    return 'ghoul';
  }

  function spawnAtEdge(type, scale) {
    const g = game, p = g.player;
    const dist = Math.hypot(W, H) / (2 * zoom) + rand(80, 160);
    let x = 0, y = 0, ok = false;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU;
      x = p.x + Math.cos(a) * dist;
      y = p.y + Math.sin(a) * dist;
      const d = Math.hypot(x, y);
      if (d > ARENA_R - 70) {
        const k = (ARENA_R - 70) / d;
        x *= k; y *= k;
      }
      if (dist2(x, y, p.x, p.y) > 280 * 280) { ok = true; break; }
    }
    if (!ok) {
      const a = Math.atan2(p.y, p.x) + Math.PI;
      x = p.x + Math.cos(a) * dist;
      y = p.y + Math.sin(a) * dist;
      const d = Math.hypot(x, y) || 1;
      const k = Math.min(1, (ARENA_R - 70) / d);
      x *= k; y *= k;
    }
    const prog = g.t / g.duration;
    const eliteChance = prog * 0.045 + (type === 'brute' ? 0.015 : 0);
    const elite = Math.random() < eliteChance;
    spawnEnemy(type, x, y, elite);
  }

  function spawnEnemy(type, x, y, elite) {
    const g = game;
    const def = ENEMY_DEFS[type];
    const prog = g.t / g.duration;
    const hpScale = (1 + prog * 1.9 + g.t / 60 * 0.055) * g.mode.hp;
    const dmgScale = (1 + prog * 0.9) * g.mode.dmg;
    const speedScale = 1 + prog * 0.16;
    const e = {
      type,
      sprite: def.sprite,
      x, y,
      vx: 0, vy: 0,
      r: def.r * (elite ? 1.28 : 1),
      hp: def.hp * hpScale * (elite ? 3.4 : 1),
      maxHp: def.hp * hpScale * (elite ? 4.2 : 1),
      speed: def.speed * speedScale * (elite ? 0.94 : 1) * rand(0.92, 1.08),
      damage: def.dmg * dmgScale * (elite ? 1.3 : 1),
      xp: def.xp * (elite ? 5 : 1),
      elite: !!elite,
      angle: Math.random() * TAU,
      walkPhase: Math.random() * TAU,
      spawnT: 0.55,
      spawnMax: 0.55,
      hitFlash: 0,
      slowT: 0,
      slowAmt: 0,
      burnT: 0,
      burnDps: 0,
      burnTick: 0,
      stun: 0,
      orbCd: 0,
      shootT: rand(1.2, 2.6),
      state: 'move',
      stateT: 0,
      blinkT: rand(1.5, 3.5),
      dead: false,
      elitePulse: Math.random() * TAU
    };
    g.enemies.push(e);

    // 传送门效果
    const n = elite ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = rand(6, 30);
      addParticle({
        type: 'dot', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        vx: Math.cos(a) * rand(-50, 50), vy: Math.sin(a) * rand(-50, 50) - 20,
        life: rand(0.3, 0.7), max: 0.7, size: rand(1, 2.6),
        color: elite ? '#ffbe6a' : '#b06aff', add: true
      });
    }
    addParticle({
      type: 'ring', x, y, vx: 0, vy: 0,
      life: 0.5, max: 0.5, size: def.r * 1.4,
      color: elite ? '#ffbe6a' : '#a95aff', add: true, width: 2
    });
    g.lights.push({ x, y, r: elite ? 120 : 80, life: 0.5, maxLife: 0.5, color: elite ? '#ffbe6a' : '#a95aff' });
    if (Math.random() < 0.22) AudioFX.portal();
    return e;
  }

  function warnBoss(index) {
    const g = game;
    g.bossWarn = { t: 3.0, index };
    const name = BOSS_NAMES[index % BOSS_NAMES.length];
    if (bwName) bwName.textContent = name;
    if (bossWarning) {
      bossWarning.classList.remove('show');
      void bossWarning.offsetWidth;
      bossWarning.classList.add('show');
    }
    AudioFX.warning();
    g.trauma = Math.min(1, g.trauma + 0.32);
    g.lights.push({ x: g.player.x, y: g.player.y, r: 460, life: 1.2, maxLife: 1.2, color: '#ef3f60' });
  }

  function spawnBoss(index) {
    const g = game, p = g.player;
    const prog = g.t / g.duration;
    const dist = Math.min(Math.hypot(W, H) / (2 * zoom) + 120, 700);
    const a = Math.random() * TAU;
    let x = p.x + Math.cos(a) * dist;
    let y = p.y + Math.sin(a) * dist;
    const d = Math.hypot(x, y) || 1;
    const k = Math.min(1, (ARENA_R - 120) / d);
    x *= k; y *= k;

    const hp = 850 * Math.pow(1.62, index) * (1 + prog * 0.5) * g.mode.hp;
    const b = {
      type: 'boss', sprite: 'boss', boss: true,
      x, y, vx: 0, vy: 0,
      r: 66, hp, maxHp: hp,
      speed: 38, damage: 28 * g.mode.dmg,
      xp: 60, elite: false,
      angle: Math.atan2(p.y - y, p.x - x),
      walkPhase: 0, spawnT: 1.2, spawnMax: 1.2,
      hitFlash: 0, slowT: 0, slowAmt: 0, burnT: 0, burnDps: 0, burnTick: 0,
      orbCd: 0, dead: false,
      state: 'chase', stateT: 1.8, attackCd: 1.6,
      beamAngle: 0, beamDone: false,
      pulse: 0, name: BOSS_NAMES[index % BOSS_NAMES.length]
    };
    g.enemies.push(b);
    g.boss = b;

    bossName.textContent = b.name;
    bossFill.style.width = '100%';
    bossBar.classList.remove('hidden');
    toast(b.name + ' 苏醒');
    AudioFX.bossRoar();
    g.trauma = 1;
    g.slowmo = 0.55;
    g.lights.push({ x, y, r: 500, life: 1.2, maxLife: 1.2, color: '#c04aff' });

    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * TAU, dd = rand(10, 90);
      addParticle({
        type: 'dot', x: x + Math.cos(ang) * dd, y: y + Math.sin(ang) * dd,
        vx: Math.cos(ang) * rand(30, 180), vy: Math.sin(ang) * rand(30, 180),
        life: rand(0.4, 1.1), max: 1.1, size: rand(1.5, 4),
        color: i % 2 ? '#d77bff' : '#ff5c8a', add: true
      });
    }
  }

  /* ---------------- 敌人更新 ---------------- */
  function updateEnemies(dt) {
    const g = game, p = g.player;
    const grid = buildGrid();

    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (e.dead) { g.enemies.splice(i, 1); continue; }

      e.hitFlash = Math.max(0, e.hitFlash - dt * 8);
      e.orbCd = Math.max(0, e.orbCd - dt);
      e.elitePulse += dt * 2;

      if (e.spawnT > 0) {
        e.spawnT -= dt;
        continue;
      }

      // 燃烧
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.35;
          damageEnemy(e, e.burnDps * 0.35, { dot: true, color: '#ff9a4d', silent: true });
          if (Math.random() < 0.6) {
            addParticle({
              type: 'dot', x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r),
              vx: rand(-14, 14), vy: rand(-40, -10),
              life: rand(0.25, 0.6), max: 0.6, size: rand(1, 2.4),
              color: '#ff9a4d', add: true
            });
          }
        }
        if (e.dead) { g.enemies.splice(i, 1); continue; }
      }

      // 减速
      let slow = 1;
      if (e.slowT > 0) { e.slowT -= dt; slow = 1 - e.slowAmt; }

      // 与玩家距离
      const dx = p.x - e.x, dy = p.y - e.y;
      const dl = Math.hypot(dx, dy) || 1;
      const nx = dx / dl, ny = dy / dl;
      e.angle = angleLerp(e.angle, Math.atan2(dy, dx), Math.min(1, dt * 7));

      if (e.boss) {
        updateBoss(e, dt, nx, ny, dl);
      } else {
        updateEnemyAI(e, dt, nx, ny, dl, slow);
      }

      // 分离
      if (!e.boss) {
        const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const list = grid.get((cx + ox + 4096) * 8192 + (cy + oy + 4096));
            if (!list) continue;
            for (const o of list) {
              if (o === e || o.dead || o.spawnT > 0) continue;
              const ddx = e.x - o.x, ddy = e.y - o.y;
              const dd = Math.hypot(ddx, ddy);
              const min = (e.r + o.r) * 0.82;
              if (dd > 0.001 && dd < min) {
                const push = (min - dd) / min * 42;
                e.x += ddx / dd * push * dt * 12;
                e.y += ddy / dd * push * dt * 12;
              }
            }
          }
        }
      }

      // 边界
      const dd = Math.hypot(e.x, e.y);
      if (dd > ARENA_R - 20) {
        e.x = e.x / dd * (ARENA_R - 20);
        e.y = e.y / dd * (ARENA_R - 20);
      }

      // 接触伤害
      if (!e.dead && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r) * (e.r + p.r)) {
        if (p.invuln <= 0 && p.dashT <= 0) {
          damagePlayer(e.damage, e);
          const pushA = Math.atan2(p.y - e.y, p.x - e.x);
          p.x += Math.cos(pushA) * 14;
          p.y += Math.sin(pushA) * 14;
          if (!e.boss) {
            e.x -= Math.cos(pushA) * 10;
            e.y -= Math.sin(pushA) * 10;
          }
        }
      }

      // 行走相位
      if (!e.boss) e.walkPhase += dt * (6 + e.speed * 0.035);
      else e.walkPhase += dt * 2.2;
    }
  }

  function updateEnemyAI(e, dt, nx, ny, dl, slow) {
    const g = game;
    const p = g.player;

    switch (e.type) {
      case 'ghoul': {
        const wob = Math.sin(e.walkPhase * 0.8) * 0.35;
        const ax = nx + -ny * wob, ay = ny + nx * wob;
        e.x += ax * e.speed * slow * dt;
        e.y += ay * e.speed * slow * dt;
        break;
      }
      case 'stalker': {
        const wob = Math.sin(e.walkPhase * 1.4) * 0.22;
        e.x += (nx + -ny * wob) * e.speed * slow * dt;
        e.y += (ny + nx * wob) * e.speed * slow * dt;
        break;
      }
      case 'swarm': {
        const wob = Math.sin(e.walkPhase * 2.1 + e.elitePulse) * 0.6;
        e.x += (nx + -ny * wob) * e.speed * slow * dt;
        e.y += (ny + nx * wob) * e.speed * slow * dt;
        break;
      }
      case 'brute': {
        if (e.state === 'wind') {
          e.stateT -= dt;
          if (e.stateT <= 0) {
            e.state = 'charge';
            e.stateT = 0.55;
            e.chargeX = nx; e.chargeY = ny;
            addParticle({ type: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: e.r * 1.4, color: '#ff9a4d', add: true, width: 2 });
          }
        } else if (e.state === 'charge') {
          e.stateT -= dt;
          e.x += e.chargeX * e.speed * 3.6 * slow * dt;
          e.y += e.chargeY * e.speed * 3.6 * slow * dt;
          if (Math.random() < 0.5) {
            addParticle({ type: 'smoke', x: e.x - e.chargeX * 20, y: e.y - e.chargeY * 20, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.6, max: 0.6, size: rand(12, 22), color: '#5a4a3a', add: false });
          }
          if (e.stateT <= 0) { e.state = 'move'; e.stateT = rand(2.2, 3.4); }
        } else {
          e.stateT -= dt;
          e.x += nx * e.speed * slow * dt;
          e.y += ny * e.speed * slow * dt;
          if (e.stateT <= 0 && dl < 420) {
            e.state = 'wind'; e.stateT = 0.65;
            addParticle({ type: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: e.r * 1.2, color: '#ffb066', add: true, width: 2 });
          }
        }
        break;
      }
      case 'spitter': {
        const desired = 280;
        if (dl < desired - 40) {
          e.x -= nx * e.speed * slow * dt;
          e.y -= ny * e.speed * slow * dt;
        } else if (dl > desired + 40) {
          e.x += nx * e.speed * slow * dt;
          e.y += ny * e.speed * slow * dt;
        } else {
          const strafe = Math.sin(e.walkPhase * 0.7) * 0.7;
          e.x += -ny * e.speed * 0.6 * strafe * slow * dt;
          e.y += nx * e.speed * 0.6 * strafe * slow * dt;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && dl < 520) {
          e.shootT = rand(2.1, 3.0);
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          for (let k = -1; k <= 1; k++) {
            const a = base + k * 0.16;
            g.ebullets.push({
              x: e.x, y: e.y,
              vx: Math.cos(a) * 175, vy: Math.sin(a) * 175,
              r: 7, damage: 9 * g.mode.dmg, life: 4.2, angle: a, kind: 'poison'
            });
          }
          AudioFX.hit(0.2);
        }
        break;
      }
      case 'wraith': {
        const wob = Math.sin(e.walkPhase * 1.1) * 0.5;
        e.x += (nx + -ny * wob) * e.speed * slow * dt;
        e.y += (ny + nx * wob) * e.speed * slow * dt;
        e.blinkT -= dt;
        if (e.blinkT <= 0 && dl > 170) {
          e.blinkT = rand(2.6, 4.2);
          const bx = e.x, by = e.y;
          e.x += nx * 110;
          e.y += ny * 110;
          addParticle({ type: 'ring', x: bx, y: by, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 30, color: '#8fd8ff', add: true, width: 2 });
          addParticle({ type: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 26, color: '#8fd8ff', add: true, width: 2 });
        }
        break;
      }
    }
  }

  function updateBoss(b, dt, nx, ny, dl) {
    const g = game, p = g.player;
    b.pulse += dt;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 6);
    let slow = 1;
    if (b.slowT > 0) { b.slowT -= dt; slow = 1 - b.slowAmt; }

    if (b.burnT > 0) {
      b.burnT -= dt;
      b.burnTick -= dt;
      if (b.burnTick <= 0) {
        b.burnTick = 0.35;
        damageEnemy(b, b.burnDps * 0.35, { dot: true, silent: true, color: '#ff9a4d' });
      }
    }

    switch (b.state) {
      case 'chase': {
        const sp = b.speed * slow * (dl > 220 ? 1 : 0.4);
        b.x += nx * sp * dt;
        b.y += ny * sp * dt;
        b.attackCd -= dt;
        if (b.attackCd <= 0) startBossAttack(b);
        break;
      }
      case 'slamWind': {
        b.stateT -= dt;
        if (b.stateT <= 0) {
          b.state = 'slam';
          b.stateT = 0.28;
          const R = 165;
          addParticle({ type: 'ring', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.55, max: 0.55, size: R, color: '#ff5c8a', add: true, width: 5 });
          addParticle({ type: 'ring', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.8, max: 0.8, size: R * 0.7, color: '#ffb0c4', add: true, width: 2 });
          for (let i = 0; i < 26; i++) {
            const a = Math.random() * TAU;
            addParticle({ type: 'dot', x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, vx: Math.cos(a) * rand(100, 380), vy: Math.sin(a) * rand(100, 380), life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5), color: '#ff8aa0', add: true });
          }
          g.trauma = Math.min(1, g.trauma + 0.55);
          AudioFX.explosion(1.3);
          if (dl < R + p.r) damagePlayer(26 * g.mode.dmg, b);
        }
        break;
      }
      case 'slam': {
        b.stateT -= dt;
        if (b.stateT <= 0) { b.state = 'chase'; b.attackCd = rand(2.0, 2.8); }
        break;
      }
      case 'burstWind': {
        b.stateT -= dt;
        if (b.stateT <= 0) {
          b.state = 'chase';
          b.attackCd = rand(2.2, 3.0);
          const n = 20;
          const off = Math.random() * TAU;
          for (let i = 0; i < n; i++) {
            const a = off + i * TAU / n;
            g.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 8, damage: 11 * g.mode.dmg, life: 4.5, angle: a, kind: 'boss' });
          }
          addParticle({ type: 'ring', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 100, color: '#d77bff', add: true, width: 3 });
          AudioFX.explosion(0.7);
        }
        break;
      }
      case 'summon': {
        b.stateT -= dt;
        if (b.stateT <= 0) {
          b.state = 'chase';
          b.attackCd = rand(2.6, 3.4);
          for (let i = 0; i < 7; i++) {
            const a = Math.random() * TAU, d = rand(80, 150);
            spawnEnemy(Math.random() < 0.6 ? 'swarm' : 'ghoul', b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, false);
          }
          AudioFX.portal();
        }
        break;
      }
      case 'beamWind': {
        b.stateT -= dt;
        const targetA = Math.atan2(p.y - b.y, p.x - b.x);
        b.beamAngle = angleLerp(b.beamAngle, targetA, Math.min(1, dt * 2.4));
        if (b.stateT <= 0) {
          b.state = 'beam';
          b.stateT = 0.55;
          b.beamDone = false;
          AudioFX.explosion(0.9);
        }
        break;
      }
      case 'beam': {
        b.stateT -= dt;
        if (!b.beamDone) {
          b.beamDone = true;
          const bx = b.x, by = b.y;
          const dxp = p.x - bx, dyp = p.y - by;
          const proj = dxp * Math.cos(b.beamAngle) + dyp * Math.sin(b.beamAngle);
          if (proj > 0) {
            const perp = Math.abs(-dxp * Math.sin(b.beamAngle) + dyp * Math.cos(b.beamAngle));
            if (perp < 30 + p.r && proj < 1100) damagePlayer(24 * g.mode.dmg, b);
          }
          g.trauma = Math.min(1, g.trauma + 0.3);
        }
        if (b.stateT <= 0) { b.state = 'chase'; b.attackCd = rand(2.6, 3.6); }
        break;
      }
    }
  }

  function startBossAttack(b) {
    const roll = Math.random();
    if (roll < 0.32) {
      b.state = 'slamWind'; b.stateT = 0.85;
      addParticle({ type: 'ring', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.8, max: 0.8, size: 165, color: '#ff5c8a', add: true, width: 2 });
    } else if (roll < 0.58) {
      b.state = 'burstWind'; b.stateT = 0.6;
      addParticle({ type: 'ring', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 110, color: '#d77bff', add: true, width: 2 });
    } else if (roll < 0.78) {
      b.state = 'summon'; b.stateT = 0.75;
    } else {
      b.state = 'beamWind'; b.stateT = 1.05;
      b.beamAngle = Math.atan2(game.player.y - b.y, game.player.x - b.x);
    }
  }

  /* ---------------- 网格 ---------------- */
  function buildGrid() {
    const grid = new Map();
    const arr = game.enemies;
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (e.dead || e.spawnT > 0) continue;
      const k = cellKey(e.x, e.y);
      let list = grid.get(k);
      if (!list) { list = []; grid.set(k, list); }
      list.push(e);
    }
    return grid;
  }

  /* ---------------- 子弹 ---------------- */
  function updateBullets(dt) {
    const g = game;
    const grid = g.grid;
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || Math.hypot(b.x, b.y) > ARENA_R - 10) {
        g.bullets.splice(i, 1);
        continue;
      }

      const cx = Math.floor(b.x / CELL), cy = Math.floor(b.y / CELL);
      let removed = false;
      for (let ox = -1; ox <= 1 && !removed; ox++) {
        for (let oy = -1; oy <= 1 && !removed; oy++) {
          const list = grid.get((cx + ox + 4096) * 8192 + (cy + oy + 4096));
          if (!list) continue;
          for (const e of list) {
            if (e.dead || e.spawnT > 0) continue;
            if (b.hit.indexOf(e) >= 0) continue;
            const rr = b.r + e.r;
            if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
              hitEnemy(b, e);
              b.hit.push(e);
              if (b.pierce > 0) { b.pierce--; }
              else {
                g.bullets.splice(i, 1);
                removed = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  function hitEnemy(b, e) {
    const g = game, p = g.player;
    let dmg = b.damage;
    const crit = Math.random() < p.critChance;
    if (crit) dmg *= p.critMult;
    g.stats.hits++;
    damageEnemy(e, dmg, { crit, color: crit ? '#ffd97a' : '#ffd0d8', sourceX: b.px, sourceY: b.py });

    // 命中粒子
    const ang = Math.atan2(b.vy, b.vx);
    const n = crit ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const a = ang + Math.PI + rand(-1.1, 1.1);
      addParticle({
        type: 'dot', x: b.x, y: b.y,
        vx: Math.cos(a) * rand(40, 220), vy: Math.sin(a) * rand(40, 220),
        life: rand(0.12, 0.4), max: 0.4, size: rand(1, crit ? 3.4 : 2.4),
        color: crit ? '#ffd97a' : '#ff9db0', add: true
      });
    }
    if (crit) {
      AudioFX.crit();
      g.hitStop = Math.max(g.hitStop, 0.025);
      g.trauma = Math.min(1, g.trauma + 0.04);
    } else {
      AudioFX.hit(clamp((e.x - p.x) / 500, -1, 1));
    }

    // 元素
    if (p.burnLevel > 0) {
      e.burnT = 3;
      e.burnDps = Math.max(e.burnDps, 3.5 * p.burnLevel);
    }
    if (p.freezeLevel > 0) {
      e.slowT = 1.6;
      e.slowAmt = Math.max(e.slowAmt, Math.min(0.7, 0.22 * p.freezeLevel));
    }
    if (p.chainLevel > 0) chainLightning(e, dmg * 0.42, p.chainLevel + 1);
    if (p.lifesteal > 0 && !p.dead) {
      p.hp = Math.min(p.maxHp, p.hp + dmg * p.lifesteal);
    }
  }

  function chainLightning(from, dmg, jumps) {
    const g = game;
    let src = from;
    const hit = [from];
    for (let j = 0; j < jumps; j++) {
      let best = null, bestD = 260 * 260;
      for (const e of g.enemies) {
        if (e.dead || e.spawnT > 0 || hit.indexOf(e) >= 0) continue;
        const d = dist2(src.x, src.y, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;
      addParticle({
        type: 'lightning', x: src.x, y: src.y,
        x2: best.x, y2: best.y,
        life: 0.18, max: 0.18, color: '#a8e4ff', add: true, width: 2
      });
      damageEnemy(best, dmg, { dot: true, color: '#a8e4ff', silent: true });
      hit.push(best);
      src = best;
    }
  }

  function explodeAt(x, y, radius, dmg, color) {
    const g = game;
    addParticle({ type: 'ring', x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: radius, color: color || '#ffb066', add: true, width: 3 });
    addParticle({ type: 'ring', x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: radius * 0.6, color: color || '#ffd9a0', add: true, width: 1.5 });
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      addParticle({
        type: 'dot', x, y,
        vx: Math.cos(a) * rand(60, 300), vy: Math.sin(a) * rand(60, 300),
        life: rand(0.2, 0.55), max: 0.55, size: rand(1.5, 4),
        color: color || '#ffb066', add: true
      });
    }
    g.lights.push({ x, y, r: radius * 1.6, life: 0.35, maxLife: 0.35, color: color || '#ffb066' });
    AudioFX.explosion(0.7);
    g.trauma = Math.min(1, g.trauma + 0.18);
    for (const e of g.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      if (dist2(x, y, e.x, e.y) < (radius + e.r) * (radius + e.r)) {
        damageEnemy(e, dmg, { dot: true, color: color || '#ffb066', silent: true });
      }
    }
  }

  function updateEnemyBullets(dt) {
    const g = game, p = g.player;
    for (let i = g.ebullets.length - 1; i >= 0; i--) {
      const b = g.ebullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || Math.hypot(b.x, b.y) > ARENA_R + 40) {
        g.ebullets.splice(i, 1);
        continue;
      }
      if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
        if (p.invuln <= 0 && p.dashT <= 0) damagePlayer(b.damage, b);
        for (let k = 0; k < 10; k++) {
          const a = Math.random() * TAU;
          addParticle({
            type: 'dot', x: b.x, y: b.y,
            vx: Math.cos(a) * rand(30, 160), vy: Math.sin(a) * rand(30, 160),
            life: rand(0.15, 0.4), max: 0.4, size: rand(1, 2.8),
            color: b.kind === 'boss' ? '#d77bff' : '#9cff6b', add: true
          });
        }
        g.ebullets.splice(i, 1);
      }
    }
  }

  /* ---------------- 伤害 / 死亡 ---------------- */
  function damageEnemy(e, dmg, opts) {
    if (e.dead) return;
    opts = opts || {};
    e.hp -= dmg;
    e.hitFlash = Math.max(e.hitFlash, opts.dot ? 0.12 : 0.2);
    game.damageDealt += dmg;

    if (settings.damageNumbers && (!opts.silent || Math.random() < 0.35)) {
      const col = opts.color || '#ffd0d8';
      addText(e.x + rand(-8, 8), e.y - e.r * 0.7, Math.round(dmg), opts.crit, col);
    }

    if (!opts.dot && !e.boss) {
      const ang = Math.atan2(e.y - (opts.sourceY != null ? opts.sourceY : e.y), e.x - (opts.sourceX != null ? opts.sourceX : e.x));
      const kb = e.type === 'brute' ? 2 : e.type === 'swarm' ? 12 : 6;
      e.x += Math.cos(ang) * kb;
      e.y += Math.sin(ang) * kb;
    }

    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const g = game, p = g.player;

    if (e.boss) {
      g.boss = null;
      g.bossKills++;
      unlockAch('boss_slayer');
      bossBar.classList.add('hidden');
      g.slowmo = 1.0;
      g.trauma = 1;
      g.hitStop = 0.12;
      AudioFX.explosion(2.2);
      AudioFX.bossRoar();
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * TAU, d = rand(10, 120);
        addParticle({
          type: 'dot', x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d,
          vx: Math.cos(a) * rand(60, 420), vy: Math.sin(a) * rand(60, 420),
          life: rand(0.5, 1.4), max: 1.4, size: rand(2, 6),
          color: i % 3 === 0 ? '#ffd97a' : (i % 3 === 1 ? '#ff5c8a' : '#d77bff'), add: true
        });
      }
      addParticle({ type: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 1.2, max: 1.2, size: 320, color: '#ffd97a', add: true, width: 5 });
      g.lights.push({ x: e.x, y: e.y, r: 700, life: 1.4, maxLife: 1.4, color: '#ffd9a0' });
      toast(e.name + ' 已陨落');
      // 掉落
      for (let i = 0; i < 14; i++) {
        spawnGem(e.x + rand(-40, 40), e.y + rand(-40, 40), 5, true);
      }
      for (let i = 0; i < 2; i++) {
        g.pickups.push({ kind: 'heart', x: e.x + rand(-50, 50), y: e.y + rand(-50, 50), phase: Math.random() * TAU, life: 60 });
      }
      return;
    }

    g.kills++;
    g.combo++;
    g.comboT = 3;
    if (g.kills === 1) unlockAch('first_blood');
    if (meta.kills + g.kills >= 500) unlockAch('kill_500');
    AudioFX.kill(clamp((e.x - p.x) / 500, -1, 1));
    AudioFX.gem(g.combo);
    g.trauma = Math.min(1, g.trauma + (e.elite ? 0.16 : 0.025));

    // 死亡粒子
    const n = e.elite ? 30 : (e.type === 'brute' ? 22 : 12);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      addParticle({
        type: Math.random() < 0.5 ? 'dot' : 'smoke',
        x: e.x, y: e.y,
        vx: Math.cos(a) * rand(20, e.elite ? 260 : 150),
        vy: Math.sin(a) * rand(20, e.elite ? 260 : 150),
        life: rand(0.25, 0.8), max: 0.8,
        size: rand(1.5, e.elite ? 5 : 3.4),
        color: e.elite ? '#ffbe6a' : (Math.random() < 0.5 ? '#5a1826' : '#2a1220'),
        add: Math.random() < 0.4
      });
    }
    // 血渍
    if (g.decals.length < 160) {
      const img = Art.decals[Math.floor(Math.random() * Art.decals.length)];
      g.decals.push({ x: e.x, y: e.y, img, rot: Math.random() * TAU, scale: (e.r / 16) * rand(0.7, 1.15), life: 40, max: 40 });
    }

    // 掉落经验
    const xpVal = Math.max(1, Math.round(e.xp * (1 + (g.t / g.duration) * 0.5)));
    if (e.elite) {
      spawnGem(e.x, e.y, xpVal, true);
      spawnGem(e.x + rand(-20, 20), e.y + rand(-20, 20), xpVal, true);
      if (Math.random() < 0.55) {
        g.pickups.push({ kind: 'heart', x: e.x, y: e.y, phase: Math.random() * TAU, life: 45 });
      }
    } else if (xpVal >= 4) {
      spawnGem(e.x, e.y, xpVal, true);
    } else {
      spawnGem(e.x, e.y, xpVal, false);
      if (e.type === 'brute' && Math.random() < 0.5) {
        spawnGem(e.x + rand(-12, 12), e.y + rand(-12, 12), 1, false);
      }
    }

    // 爆裂
    if (p.explodeLevel > 0) {
      const radius = 62 + p.explodeLevel * 16;
      const dmg = 10 + p.explodeLevel * 9;
      explodeAt(e.x, e.y, radius, dmg, '#ff9d5c');
    }
  }

  function damagePlayer(amount, source) {
    const g = game, p = g.player;
    if (p.dead || p.invuln > 0 || p.dashT > 0 || state !== 'playing') return;
    p.hp -= amount;
    p.invuln = 1.15;
    p.hurtFlash = 1;
    g.trauma = Math.min(1, g.trauma + 0.5);
    g.hitStop = 0.05;
    AudioFX.hurt();
    flashHurt();
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      addParticle({
        type: 'dot', x: p.x, y: p.y,
        vx: Math.cos(a) * rand(50, 240), vy: Math.sin(a) * rand(50, 240),
        life: rand(0.2, 0.55), max: 0.55, size: rand(1.4, 3.6),
        color: '#ff4d6d', add: true
      });
    }
    // 受击时震开周围敌人，避免被围死
    for (const e of g.enemies) {
      if (e.boss || e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 130 * 130 && d2 > 1) {
        const d = Math.sqrt(d2);
        e.x += dx / d * 44;
        e.y += dy / d * 44;
        e.vx += dx / d * 160;
        e.vy += dy / d * 160;
        e.slowT = Math.max(e.slowT || 0, 0.4);
        e.slowAmt = Math.max(e.slowAmt || 0, 0.35);
      }
    }
    if (p.hp <= 0) {
      if (p.revives > 0) {
        p.revives--;
        p.hp = p.maxHp * 0.5;
        p.invuln = 2.6;
        g.trauma = 1;
        g.slowmo = 0.7;
        toast('第二心脏 · 复苏');
        AudioFX.levelUp();
        fxFlash.style.opacity = '0.9';
        setTimeout(() => { fxFlash.style.opacity = '0'; }, 120);
        explodeAt(p.x, p.y, 240, 80, '#ffd97a');
        for (const e of g.enemies) {
          if (!e.boss && !e.dead && dist2(e.x, e.y, p.x, p.y) < 260 * 260) {
            damageEnemy(e, 200, { dot: true, silent: true, color: '#ffd97a' });
          }
        }
      } else {
        p.hp = 0;
        p.dead = true;
        AudioFX.hurt();
        explodeAt(p.x, p.y, 180, 0, '#ff4d6d');
        g.trauma = 1;
        g.slowmo = 0.9;
        for (let i = 0; i < 50; i++) {
          const a = Math.random() * TAU;
          addParticle({
            type: 'dot', x: p.x, y: p.y,
            vx: Math.cos(a) * rand(40, 320), vy: Math.sin(a) * rand(40, 320),
            life: rand(0.4, 1.2), max: 1.2, size: rand(1.5, 5),
            color: i % 2 ? '#ff4d6d' : '#ffd0a0', add: true
          });
        }
        beginEnd(false);
      }
    }
  }

  function flashHurt() {
    fxHurt.style.opacity = '1';
    setTimeout(() => { fxHurt.style.opacity = '0'; }, 90);
  }

  /* ---------------- 经验 / 掉落 ---------------- */
  function spawnGem(x, y, value, big) {
    const g = game;
    if (g.gems.length >= MAX_GEMS) {
      const t = g.gems[Math.floor(Math.random() * g.gems.length)];
      t.value += value;
      return;
    }
    const a = Math.random() * TAU;
    const sp = rand(20, 110);
    g.gems.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      value, big: !!big,
      phase: Math.random() * TAU,
      r: big ? 11 : 7,
      life: 0
    });
  }

  function updateGems(dt) {
    const g = game, p = g.player;
    const pickup = 150 * p.pickupMult;
    const pickup2 = pickup * pickup;
    const drift2 = 720 * 720;
    for (let i = g.gems.length - 1; i >= 0; i--) {
      const gem = g.gems[i];
      gem.life += dt;
      gem.phase += dt * 2.6;

      const d2 = dist2(gem.x, gem.y, p.x, p.y);
      if (d2 < pickup2) {
        const d = Math.sqrt(d2) || 1;
        const pull = 1500;
        gem.vx += (p.x - gem.x) / d * pull * dt;
        gem.vy += (p.y - gem.y) / d * pull * dt;
        const sp = Math.hypot(gem.vx, gem.vy);
        if (sp > 900) { gem.vx = gem.vx / sp * 900; gem.vy = gem.vy / sp * 900; }
      } else if (d2 < drift2) {
        // 远处经验缓慢向玩家漂移，避免大量宝石滞留
        const d = Math.sqrt(d2) || 1;
        gem.vx += (p.x - gem.x) / d * 240 * dt;
        gem.vy += (p.y - gem.y) / d * 240 * dt;
        const sp = Math.hypot(gem.vx, gem.vy);
        if (sp > 340) { gem.vx = gem.vx / sp * 340; gem.vy = gem.vy / sp * 340; }
      } else {
        gem.vx *= (1 - dt * 3.2);
        gem.vy *= (1 - dt * 3.2);
      }
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;

      if (d2 < 26 * 26) {
        gainXp(gem.value);
        AudioFX.gem(g.combo);
        for (let k = 0; k < 6; k++) {
          const a = Math.random() * TAU;
          addParticle({
            type: 'dot', x: gem.x, y: gem.y,
            vx: Math.cos(a) * rand(20, 120), vy: Math.sin(a) * rand(20, 120),
            life: rand(0.15, 0.4), max: 0.4, size: rand(1, 2.4),
            color: gem.big ? '#ffd97a' : '#7cf0c8', add: true
          });
        }
        g.gems.splice(i, 1);
      }
    }
  }

  function gainXp(v) {
    const g = game;
    g.xp += v * g.player.xpMult;
    let leveled = false;
    while (g.xp >= g.xpNext) {
      g.xp -= g.xpNext;
      g.level++;
      g.xpNext = xpForLevel(g.level);
      g.pendingLevels++;
      leveled = true;
    }
    if (leveled) {
      if (g.level >= 15) unlockAch('level_15');
      g.player.hp = Math.min(g.player.maxHp, g.player.hp + g.player.maxHp * 0.08);
      AudioFX.levelUp();
      fxFlash.style.opacity = '0.55';
      setTimeout(() => { fxFlash.style.opacity = '0'; }, 140);
      addParticle({ type: 'ring', x: g.player.x, y: g.player.y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 140, color: '#ffd97a', add: true, width: 3 });
    }
  }

  function updatePickups(dt) {
    const g = game, p = g.player;
    for (let i = g.pickups.length - 1; i >= 0; i--) {
      const it = g.pickups[i];
      it.phase += dt * 2;
      it.life -= dt;
      if (it.life <= 0) { g.pickups.splice(i, 1); continue; }
      const d2 = dist2(it.x, it.y, p.x, p.y);
      if (d2 < 42 * 42) {
        if (it.kind === 'heart') {
          p.hp = Math.min(p.maxHp, p.hp + 30);
          AudioFX.heal();
          toast('生命 +30');
          addParticle({ type: 'ring', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 60, color: '#ff6b8a', add: true, width: 2 });
          for (let k = 0; k < 12; k++) {
            const a = Math.random() * TAU;
            addParticle({ type: 'dot', x: p.x, y: p.y, vx: Math.cos(a) * rand(20, 140), vy: Math.sin(a) * rand(20, 140), life: rand(0.2, 0.5), max: 0.5, size: rand(1, 2.6), color: '#ff8aa0', add: true });
          }
        }
        g.pickups.splice(i, 1);
      }
    }
  }

  /* ---------------- 粒子 ---------------- */
  function addParticle(p) {
    const g = game;
    if (!g) return;
    if (settings.reduceMotion && Math.random() < 0.3) return;
    p.max = p.max || p.life || 0.5;
    const cap = qualityLow ? 700 : MAX_PARTICLES;
    if (g.particles.length >= cap) {
      g.particles[Math.floor(Math.random() * g.particles.length)] = p;
    } else {
      g.particles.push(p);
    }
  }

  function addText(x, y, value, crit, color) {
    const g = game;
    if (!g) return;
    if (g.texts.length > 90) g.texts.shift();
    g.texts.push({
      x, y,
      vx: rand(-16, 16), vy: crit ? -78 : -58,
      life: crit ? 0.85 : 0.6, max: crit ? 0.85 : 0.6,
      value, crit, color: color || '#ffd0d8'
    });
  }

  function updateParticles(dt) {
    const g = game;
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.life -= dt;
      if (p.life <= 0) { g.particles.splice(i, 1); continue; }
      if (p.vx != null) p.x += p.vx * dt;
      if (p.vy != null) p.y += p.vy * dt;
      if (p.grav) p.vy += p.grav * dt;
      if (p.drag) { p.vx *= (1 - p.drag * dt); p.vy *= (1 - p.drag * dt); }
      if (p.vr) p.rot += p.vr * dt;
    }
    for (let i = g.texts.length - 1; i >= 0; i--) {
      const t = g.texts[i];
      t.life -= dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 90 * dt;
      if (t.life <= 0) g.texts.splice(i, 1);
    }
    for (let i = g.decals.length - 1; i >= 0; i--) {
      const d = g.decals[i];
      d.life -= dt;
      if (d.life <= 0) g.decals.splice(i, 1);
    }
  }

  function updateLights(dt) {
    const g = game;
    for (let i = g.lights.length - 1; i >= 0; i--) {
      g.lights[i].life -= dt;
      if (g.lights[i].life <= 0) g.lights.splice(i, 1);
    }
  }

  /* ---------------- 升级界面 ---------------- */
  function openLevelUp() {
    if (state !== 'playing' || game.pendingLevels <= 0) return;
    game.pendingLevels--;
    state = 'levelup';
    game.offers = Upgrades.roll(game.player, 3);
    renderOffers();
    levelupScreen.classList.remove('hidden');
    AudioFX.levelUp();
  }

  function renderOffers() {
    const g = game;
    cardsEl.innerHTML = '';
    const labels = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
    g.offers.forEach((u, idx) => {
      const lv = g.player.upgrades[u.id] || 0;
      const rar = Upgrades.RARITY[u.rarity];
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--rar-color', rar.color);
      card.style.setProperty('--rar-glow', rar.glow);
      card.style.animationDelay = (idx * 0.07) + 's';
      card.dataset.index = idx;

      let pips = '';
      const maxShow = Math.min(u.max, 5);
      for (let k = 0; k < maxShow; k++) {
        pips += '<span class="pip' + (k < lv ? ' on' : '') + (k === lv ? ' new' : '') + '"></span>';
      }

      card.innerHTML =
        '<div class="card-rarity">' + rar.name + ' · ' + rar.cn + '</div>' +
        '<div class="card-icon">' + u.icon + '</div>' +
        '<div class="card-name">' + u.name + '</div>' +
        '<div class="card-level">' + pips + '</div>' +
        '<div class="card-desc">' + u.desc(lv + 1) + '</div>' +
        '<div class="card-key">' + (idx + 1) + '</div>';

      card.addEventListener('click', () => chooseOffer(idx));
      card.addEventListener('mouseenter', () => AudioFX.hover());
      cardsEl.appendChild(card);
    });
    $('reroll-count').textContent = g.rerolls;
    $('reroll').disabled = g.rerolls <= 0;
  }

  function chooseOffer(idx) {
    if (state !== 'levelup') return;
    const g = game;
    const u = g.offers[idx];
    if (!u) return;
    Upgrades.apply(g.player, u);
    AudioFX.select();
    const rar = Upgrades.RARITY[u.rarity];
    toast('获得 · ' + u.name + (rar && (u.rarity === 'legendary' || u.rarity === 'epic') ? '  ' + rar.cn : ''));
    levelupScreen.classList.add('hidden');
    state = 'playing';
    lastTime = performance.now();
    g.offers = [];
    g.levelupDelay = 0.28;
    updateHud(true);
  }

  /* ---------------- Toast ---------------- */
  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    toastLayer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
  }

  /* ---------------- 结算过渡 ---------------- */
  function updateEnding(dt) {
    const g = game;
    if (g.endWin) {
      // 敌人逐一化为灰烬
      let n = 0;
      for (let i = g.enemies.length - 1; i >= 0 && n < 3; i--) {
        const e = g.enemies[i];
        if (e.dead) { g.enemies.splice(i, 1); continue; }
        e.dead = true;
        g.enemies.splice(i, 1);
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * TAU;
          addParticle({ type: 'dot', x: e.x, y: e.y, vx: Math.cos(a) * rand(20, 160), vy: Math.sin(a) * rand(20, 160) - 40, life: rand(0.4, 1.0), max: 1.0, size: rand(1, 3), color: '#ffd9a0', add: true });
        }
        n++;
      }
      g.ebullets.length = 0;
      // 金色余烬
      if (Math.random() < 0.8) {
        addParticle({
          type: 'dot',
          x: g.player.x + rand(-W / zoom / 2, W / zoom / 2),
          y: g.player.y + rand(0, H / zoom / 2),
          vx: rand(-10, 10), vy: rand(-70, -30),
          life: rand(1, 2.4), max: 2.4, size: rand(1, 3), color: '#ffd9a0', add: true
        });
      }
      if (g.endT > 3.0) showEndScreen(true);
    } else {
      if (g.endT > 1.8) showEndScreen(false);
    }
  }

  /* =========================================================
     菜单场景更新
     ========================================================= */
  function updateMenu(dt) {
    menuCam.x = Math.sin(menuT * 0.06) * 110;
    menuCam.y = Math.cos(menuT * 0.045) * 70;
    updateFog(dt);
    updateEmbers(dt);
  }

  function updateFog(dt) {
    for (const f of fogBlobs) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.phase += dt * 0.2;
      if (Math.abs(f.x) > ARENA_R) f.vx *= -1;
      if (Math.abs(f.y) > ARENA_R) f.vy *= -1;
    }
  }

  function updateEmbers(dt) {
    const cx = state === 'menu' ? menuCam.x : (game ? game.camera.x : 0);
    const cy = state === 'menu' ? menuCam.y : (game ? game.camera.y : 0);
    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.life -= dt;
      e.x += (e.vx + Math.sin(e.life * 1.7 + e.hue * 10) * 6) * dt;
      e.y += e.vy * dt;
      if (e.life <= 0 || Math.abs(e.x - cx) > W / zoom / 2 + 140 || Math.abs(e.y - cy) > H / zoom / 2 + 140) {
        embers[i] = newEmber(false);
      }
    }
  }

  /* =========================================================
     渲染
     ========================================================= */
  function render(dtReal) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, W, H);

    if (!game) { renderMenu(dtReal); return; }

    const g = game;
    const cam = g.camera;
    const shake = shakeAmount(g);
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    drawWorld(g);

    ctx.restore();

    drawLighting(g);
    drawGlowPass(g);
    drawDamageTexts(g);
    drawDawnOverlay(g);
  }

  function renderMenu(dtReal) {
    const shake = 0;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-menuCam.x, -menuCam.y);
    drawGroundLayer(menuCam.x, menuCam.y, -1);
    drawDecorations(menuCam.x, menuCam.y);
    drawFogLayer(menuCam.x, menuCam.y, 0.8);
    drawArenaRing(0.35);
    drawEmbers(menuCam.x, menuCam.y);
    ctx.restore();

    // 菜单光照：中央柔光
    if (lightCtx) {
      const lw = lightCv.width, lh = lightCv.height;
      lightCtx.setTransform(1, 0, 0, 1, 0, 0);
      lightCtx.clearRect(0, 0, lw, lh);
      lightCtx.fillStyle = 'rgb(20,25,42)';
      lightCtx.fillRect(0, 0, lw, lh);
      lightCtx.globalCompositeOperation = 'destination-out';
      const cx = lw / 2, cy = lh * 0.56, r = Math.max(lw, lh) * 0.55;
      const gr = lightCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, 'rgba(0,0,0,0.92)');
      gr.addColorStop(0.45, 'rgba(0,0,0,0.55)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = gr;
      lightCtx.fillRect(0, 0, lw, lh);
      lightCtx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(lightCv, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 暖光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, Math.max(W, H) * 0.5);
    grd.addColorStop(0, 'rgba(255,170,90,0.09)');
    grd.addColorStop(0.5, 'rgba(255,140,70,0.03)');
    grd.addColorStop(1, 'rgba(255,140,70,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawWorld(g) {
    const cam = g.camera;
    drawGroundLayer(cam.x, cam.y, g.t / g.duration);
    drawDecals(g);
    drawDecorations(cam.x, cam.y);
    drawRitualCircle();
    if (!qualityLow) drawFogLayer(cam.x, cam.y, 0.55);
    drawArenaRing(g.t / g.duration);
    drawShadows(g);
    drawGems(g);
    drawPickups(g);
    drawEnemies(g);
    drawPlayer(g);
    drawOrbs(g);
    drawAura(g);
    drawBullets(g);
    drawEnemyBullets(g);
    drawBossBeam(g);
    drawParticles(g);
    drawEmbers(cam.x, cam.y);
  }

  function viewBounds(cx, cy) {
    const hw = W / (2 * zoom) + 120, hh = H / (2 * zoom) + 120;
    return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
  }

  function drawGroundLayer(cx, cy, prog) {
    const v = viewBounds(cx, cy);
    ctx.fillStyle = '#04050a';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_R, 0, TAU);
    ctx.clip();
    if (groundPattern) {
      ctx.fillStyle = groundPattern;
      ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    }
    // 中央微光 / 边缘暗化
    const gr = ctx.createRadialGradient(0, 0, 180, 0, 0, ARENA_R);
    gr.addColorStop(0, 'rgba(30,44,54,0.10)');
    gr.addColorStop(0.55, 'rgba(0,0,0,0.04)');
    gr.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = gr;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    ctx.restore();
  }

  function drawArenaRing(prog) {
    const v = viewBounds(game ? game.camera.x : menuCam.x, game ? game.camera.y : menuCam.y);
    // 只在接近边界时绘制
    const nearEdge = Math.hypot(v.x0, v.y0) < ARENA_R + 200 || Math.hypot(v.x1, v.y1) < ARENA_R + 200 ||
      Math.abs(v.x0) > ARENA_R - 300 || Math.abs(v.x1) > ARENA_R - 300 ||
      Math.abs(v.y0) > ARENA_R - 300 || Math.abs(v.y1) > ARENA_R - 300;
    if (!nearEdge) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_R + 40, 0, TAU);
    ctx.arc(0, 0, ARENA_R - 8, 0, TAU, true);
    ctx.fillStyle = 'rgba(10,14,20,0.95)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(60,74,90,0.85)';
    ctx.lineWidth = 26;
    ctx.beginPath(); ctx.arc(0, 0, ARENA_R - 4, 0, TAU); ctx.stroke();

    ctx.strokeStyle = 'rgba(168,220,255,' + (0.10 + prog * 0.18) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, ARENA_R - 18, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, ARENA_R + 10, 0, TAU); ctx.stroke();

    // 符文
    ctx.strokeStyle = 'rgba(168,220,255,' + (0.16 + prog * 0.2) + ')';
    ctx.lineWidth = 2;
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * TAU;
      const x = Math.cos(a) * (ARENA_R - 4), y = Math.sin(a) * (ARENA_R - 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      if (i % 4 === 0) {
        ctx.moveTo(-5, -6); ctx.lineTo(5, -6); ctx.lineTo(0, 6); ctx.closePath();
      } else {
        ctx.moveTo(0, -5); ctx.lineTo(0, 5);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRitualCircle() {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#8fb8d8';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 250, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 232, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 170, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 232, Math.sin(a) * 232);
      ctx.lineTo(Math.cos(a) * 250, Math.sin(a) * 250);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.09;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = i / 6 * TAU - Math.PI / 2;
      const x = Math.cos(a) * 170, y = Math.sin(a) * 170;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawDecorations(cx, cy) {
    const v = viewBounds(cx, cy);
    for (const d of decorations) {
      if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
      const img = d.img;
      const w = img.width / 2 * d.scale;
      const h = img.height / 2 * d.scale;
      ctx.save();
      ctx.translate(d.x, d.y);
      if (d.rot) ctx.rotate(d.rot);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  function drawFogLayer(cx, cy, alphaMul) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of fogBlobs) {
      const v = viewBounds(cx, cy);
      if (f.x < v.x0 - 400 || f.x > v.x1 + 400 || f.y < v.y0 - 400 || f.y > v.y1 + 400) continue;
      const s = f.img.width * f.scale * 0.5;
      const a = f.alpha * alphaMul * (0.8 + Math.sin(f.phase) * 0.2);
      ctx.globalAlpha = a;
      ctx.drawImage(f.img, f.x - s / 2, f.y - s / 2, s, s);
    }
    ctx.restore();
  }

  function drawDecals(g) {
    const v = viewBounds(g.camera.x, g.camera.y);
    for (const d of g.decals) {
      if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
      const s = 96 * d.scale;
      ctx.save();
      ctx.globalAlpha = Math.min(1, d.life / 6) * 0.8;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.drawImage(d.img, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  function drawShadows(g) {
    const sh = Art.misc.shadow;
    const v = viewBounds(g.camera.x, g.camera.y);
    ctx.save();
    for (const e of g.enemies) {
      if (e.x < v.x0 || e.x > v.x1 || e.y < v.y0 || e.y > v.y1) continue;
      const s = e.r * 2.6;
      ctx.globalAlpha = e.spawnT > 0 ? 0.3 : 0.55;
      ctx.drawImage(sh, e.x - s / 2, e.y + e.r * 0.35 - s * 0.22, s, s * 0.62);
    }
    const p = g.player;
    if (!p.dead) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sh, p.x - 26, p.y + 8, 52, 26);
    }
    ctx.restore();
  }

  function drawGems(g) {
    const v = viewBounds(g.camera.x, g.camera.y);
    const spr = Art.misc.gem, sprBig = Art.misc.gemBig;
    for (const gem of g.gems) {
      if (gem.x < v.x0 || gem.x > v.x1 || gem.y < v.y0 || gem.y > v.y1) continue;
      const img = gem.big ? sprBig : spr;
      const size = gem.big ? 30 : 20;
      const bob = Math.sin(gem.phase) * 2.5;
      ctx.save();
      ctx.translate(gem.x, gem.y + bob);
      ctx.rotate(gem.phase * 0.35);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function drawPickups(g) {
    const v = viewBounds(g.camera.x, g.camera.y);
    for (const it of g.pickups) {
      if (it.x < v.x0 || it.x > v.x1 || it.y < v.y0 || it.y > v.y1) continue;
      const bob = Math.sin(it.phase) * 4;
      const size = 30;
      ctx.save();
      ctx.translate(it.x, it.y + bob);
      ctx.drawImage(Art.misc.heart, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function drawEnemies(g) {
    const v = viewBounds(g.camera.x, g.camera.y);
    const sprites = Art.enemies;
    for (const e of g.enemies) {
      if (e.x < v.x0 || e.x > v.x1 || e.y < v.y0 || e.y > v.y1) continue;
      const s = sprites[e.sprite];
      if (!s) continue;
      const scale = e.r / s.bodyR;
      const alpha = e.spawnT > 0 ? 1 - e.spawnT / e.spawnMax : 1;
      const spawnScale = e.spawnT > 0 ? 0.55 + (1 - e.spawnT / e.spawnMax) * 0.45 : 1;
      const img = e.elite ? s.elite : s.img;
      const wob = Math.sin(e.walkPhase) * 0.045;
      const sx = 1 + wob, sy = 1 - wob;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.scale(scale * spawnScale * sx, scale * spawnScale * sy);
      const half = s.size / 2;
      ctx.drawImage(img, -half, -half, s.size, s.size);
      // 自发光：暗场中保留身体细节
      if (!e.elite) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.14;
        ctx.drawImage(img, -half, -half, s.size, s.size);
      }
      ctx.restore();

      // 受击闪白
      if (e.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.9, e.hitFlash * 4.5);
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.scale(scale * spawnScale, scale * spawnScale);
        ctx.drawImage(e.elite ? s.eliteFlash : s.flash, -half, -half, s.size, s.size);
        ctx.restore();
      }

      // 减速冰霜
      if (e.slowT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#8fd8ff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 1.15, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 精英光环
      if (e.elite) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + Math.sin(e.elitePulse) * 0.12;
        ctx.strokeStyle = '#ffbe6a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 1.35, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // 生成中的传送门
      if (e.spawnT > 0) {
        const pr = (1 - e.spawnT / e.spawnMax);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * (1 - pr);
        ctx.strokeStyle = e.elite ? '#ffbe6a' : '#b06aff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (1.2 + pr * 0.9), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // 精英血条
      if (e.elite && !e.boss) {
        const w = 34, h = 3;
        const yy = e.y - e.r - 12;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(e.x - w / 2, yy, w, h);
        ctx.fillStyle = '#ffbe6a';
        ctx.fillRect(e.x - w / 2, yy, w * Math.max(0, e.hp / e.maxHp), h);
      }
    }
  }

  function drawPlayer(g) {
    const p = g.player;
    if (p.dead) return;

    // 冲刺残影
    for (const a of p.afterimages) {
      const k = a.life / a.max;
      ctx.save();
      ctx.globalAlpha = k * 0.35;
      ctx.translate(a.x, a.y);
      ctx.rotate(a.a);
      ctx.fillStyle = '#7fd0e8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 10, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const speed = Math.hypot(p.vx, p.vy);
    const moving = speed > 20;
    const moveA = moving ? Math.atan2(p.vy, p.vx) : p.aim + Math.PI;
    const bob = moving ? Math.sin(p.walkPhase) * 1.6 : Math.sin(g.t * 2.2) * 0.8;

    ctx.save();
    ctx.translate(p.x, p.y + bob);

    // 斗篷（朝移动反方向飘）
    ctx.save();
    ctx.rotate(moveA);
    const flutter = Math.sin(g.t * 6 + p.walkPhase) * 2.6;
    const cg = ctx.createLinearGradient(6, 0, -30, 0);
    cg.addColorStop(0, '#2d5a66');
    cg.addColorStop(0.45, '#183a43');
    cg.addColorStop(1, '#08181d');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(3, -9);
    ctx.quadraticCurveTo(-12, -16 + flutter, -28, -7 + flutter);
    ctx.quadraticCurveTo(-20, 0, -25, 11 - flutter);
    ctx.quadraticCurveTo(-10, 14, 3, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,220,.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 靴子
    const step = moving ? Math.sin(p.walkPhase) * 3.2 : 0;
    ctx.fillStyle = '#0c1a1f';
    ctx.beginPath(); ctx.ellipse(-5, 11 + step, 4, 5.5, 0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, 11 - step, 4, 5.5, -0.2, 0, TAU); ctx.fill();

    // 身体
    const bg = ctx.createRadialGradient(-3, -2, 2, 0, 2, 15);
    bg.addColorStop(0, '#35636f');
    bg.addColorStop(0.55, '#1c414b');
    bg.addColorStop(1, '#0a2027');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, 2, 10.5, 12.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,10,12,.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 围巾
    ctx.strokeStyle = '#a87b42';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.quadraticCurveTo(0, -1, 7, -4);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.quadraticCurveTo(11, 2, 9, 8);
    ctx.stroke();

    // 持枪手臂
    ctx.save();
    ctx.rotate(p.aim);
    const rec = p.recoil * 2.6;
    // 袖子
    ctx.strokeStyle = '#214a55';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1, 1.5);
    ctx.lineTo(12 - rec, 0);
    ctx.stroke();
    // 手套
    ctx.fillStyle = '#0c1e24';
    ctx.beginPath();
    ctx.arc(13 - rec, 0, 3.4, 0, TAU);
    ctx.fill();
    // 枪身
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(12 - rec, -2.4, 8, 4.8);
    // 枪管
    const gg = ctx.createLinearGradient(18, -2.2, 33, 2.2);
    gg.addColorStop(0, '#7d8b8e');
    gg.addColorStop(0.35, '#c3cfd0');
    gg.addColorStop(0.55, '#5d6b6f');
    gg.addColorStop(1, '#20282b');
    ctx.fillStyle = gg;
    ctx.fillRect(18 - rec, -2.2, 15, 4.4);
    // 高光
    ctx.fillStyle = 'rgba(230,245,250,.35)';
    ctx.fillRect(18.5 - rec, -1.9, 12, 1);
    // 枪口
    ctx.fillStyle = '#12181a';
    ctx.fillRect(32 - rec, -2.7, 3, 5.4);
    // 扳机护圈
    ctx.strokeStyle = '#2a3438';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(16 - rec, 3, 3, 0, Math.PI);
    ctx.stroke();
    // 枪口闪光
    if (p.muzzle > 0) {
      const k = p.muzzle / 0.06;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(36 - rec, 0);
      ctx.globalAlpha = k;
      const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
      fg.addColorStop(0, 'rgba(255,255,235,1)');
      fg.addColorStop(0.3, 'rgba(255,210,130,.9)');
      fg.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff6dc';
      ctx.beginPath();
      ctx.moveTo(0, -4.5); ctx.lineTo(12, 0); ctx.lineTo(0, 4.5); ctx.lineTo(3.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 灯笼
    const swing = Math.sin(p.lanternPhase) * 0.22;
    const lx = -10 + Math.sin(p.lanternPhase * 0.7) * 1.4;
    const ly = 4 + Math.cos(p.lanternPhase) * 1.2;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(swing);
    ctx.strokeStyle = '#6b5636';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, -2.5); ctx.stroke();
    ctx.strokeStyle = '#8a6a3f';
    ctx.beginPath(); ctx.arc(0, -2.6, 3.4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(-3.6, -0.5, 7.2, 8.4);
    const lg = ctx.createLinearGradient(0, 0, 0, 7);
    lg.addColorStop(0, '#fff0c8');
    lg.addColorStop(0.5, '#ffc46e');
    lg.addColorStop(1, '#c26a2a');
    ctx.fillStyle = lg;
    ctx.fillRect(-2.3, 0.7, 4.6, 6);
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-3.6, -0.5, 7.2, 8.4);
    ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0, 7.9); ctx.stroke();
    ctx.fillStyle = '#5a4a32';
    ctx.fillRect(-4.3, -1.8, 8.6, 1.5);
    ctx.fillRect(-4.3, 7.6, 8.6, 1.4);
    ctx.restore();

    // 帽子
    const hg = ctx.createRadialGradient(-4, -11, 2, 0, -7, 18);
    hg.addColorStop(0, '#2c4b54');
    hg.addColorStop(0.65, '#16313a');
    hg.addColorStop(1, '#08181d');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, -6.5, 16, 8.8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,10,12,.85)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8.2, -8);
    ctx.quadraticCurveTo(-6.5, -16.5, 0, -18);
    ctx.quadraticCurveTo(6.5, -16.5, 8.2, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#7a5a30';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, -8.8, 7.8, 2.5, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#d9b46a';
    ctx.fillRect(-1.2, -10.2, 2.4, 2.2);
    ctx.strokeStyle = 'rgba(168,220,255,.32)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -6.5, 15.4, 8.3, 0, Math.PI * 1.05, Math.PI * 1.68);
    ctx.stroke();

    ctx.restore();

    // 无敌护盾
    if (p.invuln > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 + Math.sin(g.t * 18) * 0.06;
      ctx.strokeStyle = '#a8dcff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawOrbs(g) {
    const p = g.player;
    if (p.orbLevel <= 0) return;
    const count = p.orbLevel;
    const orbitR = 88 + p.orbLevel * 5;
    const base = g.t * 2.1;
    for (let i = 0; i < count; i++) {
      const a = base + i * TAU / count;
      const x = p.x + Math.cos(a) * orbitR;
      const y = p.y + Math.sin(a) * orbitR;
      // 拖尾
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const aa = a - k * 0.06;
        const xx = p.x + Math.cos(aa) * orbitR;
        const yy = p.y + Math.sin(aa) * orbitR;
        ctx.globalAlpha = 0.18 * (1 - k / 5);
        ctx.fillStyle = '#8ce8ff';
        ctx.beginPath();
        ctx.arc(xx, yy, 7 - k * 0.8, 0, TAU);
        ctx.fill();
      }
      const og = ctx.createRadialGradient(x, y, 0, x, y, 15);
      og.addColorStop(0, 'rgba(240,255,255,1)');
      og.addColorStop(0.35, 'rgba(140,232,255,.85)');
      og.addColorStop(1, 'rgba(60,140,220,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawAura(g) {
    const p = g.player;
    if (p.auraLevel <= 0) return;
    const radius = 90 + p.auraLevel * 16;
    const pulse = 0.5 + Math.sin(g.t * 3.2) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10 + pulse * 0.08;
    ctx.strokeStyle = '#9cffc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + pulse * 4, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#7cffb0';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, TAU);
    ctx.fill();
    // 荆棘
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#9cffc4';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 10; i++) {
      const a = g.t * 0.5 + i / 10 * TAU;
      const r1 = radius - 6, r2 = radius + 8;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
      ctx.lineTo(p.x + Math.cos(a + 0.04) * r2, p.y + Math.sin(a + 0.04) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBullets(g) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of g.bullets) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const tx = b.x - b.vx / sp * 22;
      const ty = b.y - b.vy / sp * 22;
      const grd = ctx.createLinearGradient(tx, ty, b.x, b.y);
      grd.addColorStop(0, 'rgba(255,180,80,0)');
      grd.addColorStop(0.55, 'rgba(255,200,120,.35)');
      grd.addColorStop(1, 'rgba(255,245,210,.9)');
      ctx.strokeStyle = grd;
      ctx.lineWidth = b.r * 0.95;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,248,224,.95)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemyBullets(g) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of g.ebullets) {
      const col = b.kind === 'boss' ? '215,123,255' : '156,255,107';
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3.2);
      grd.addColorStop(0, 'rgba(255,255,255,.95)');
      grd.addColorStop(0.25, 'rgba(' + col + ',.9)');
      grd.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBossBeam(g) {
    const b = g.boss;
    if (!b || b.dead) return;
    if (b.state !== 'beamWind' && b.state !== 'beam') return;
    const len = 1200;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (b.state === 'beamWind') {
      const k = 1 - b.stateT / 1.05;
      ctx.globalAlpha = 0.25 + k * 0.45;
      ctx.strokeStyle = '#ff5c8a';
      ctx.lineWidth = 1.5 + k * 2.5;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(b.beamAngle) * len, b.y + Math.sin(b.beamAngle) * len);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const k = Math.min(1, b.stateT / 0.55);
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = 'rgba(255,120,190,.5)';
      ctx.lineWidth = 34 * k;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(b.beamAngle) * len, b.y + Math.sin(b.beamAngle) * len);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,250,.95)';
      ctx.lineWidth = 10 * k;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(b.beamAngle) * len, b.y + Math.sin(b.beamAngle) * len);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * k;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(g) {
    const v = viewBounds(g.camera.x, g.camera.y);
    // 非叠加
    ctx.save();
    for (const p of g.particles) {
      if (p.add) continue;
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (p.type === 'smoke') {
        const s = p.size * (2.4 - k * 0.8);
        ctx.globalAlpha = k * 0.32;
        ctx.drawImage(softCircle, p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.type === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // 叠加
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of g.particles) {
      if (!p.add) continue;
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
      const k = p.life / p.max;
      if (p.type === 'ring') {
        const r = p.size * (0.25 + (1 - k) * 0.85);
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = (p.width || 2) * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
      } else if (p.type === 'lightning') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = (p.width || 2);
        ctx.beginPath();
        const steps = 7;
        ctx.moveTo(p.x, p.y);
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const xx = lerp(p.x, p.x2, t) + rand(-9, 9);
          const yy = lerp(p.y, p.y2, t) + rand(-9, 9);
          ctx.lineTo(xx, yy);
        }
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = k * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.8), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawEmbers(cx, cy) {
    const v = viewBounds(cx, cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of embers) {
      if (e.x < v.x0 || e.x > v.x1 || e.y < v.y0 || e.y > v.y1) continue;
      const k = Math.max(0, e.life / e.maxLife);
      ctx.globalAlpha = k * 0.55;
      ctx.fillStyle = e.hue > 0.55 ? '#ffb765' : '#ff8a5c';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * (0.5 + k * 0.7), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- 光照 ---------------- */
  function drawLighting(g) {
    if (!lightCtx) return;
    const lw = lightCv.width, lh = lightCv.height;
    const prog = g ? g.t / g.duration : 0;
    const cam = g ? g.camera : menuCam;
    lightCtx.setTransform(1, 0, 0, 1, 0, 0);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.clearRect(0, 0, lw, lh);
    const r = Math.round(lerp(74, 132, prog));
    const gg = Math.round(lerp(84, 124, prog));
    const bb = Math.round(lerp(110, 118, prog));
    lightCtx.fillStyle = 'rgb(' + r + ',' + gg + ',' + bb + ')';
    lightCtx.fillRect(0, 0, lw, lh);

    lightCtx.globalCompositeOperation = 'destination-out';

    function hole(wx, wy, worldR, intensity) {
      const sx = ((wx - cam.x) * zoom + W / 2) * 0.5;
      const sy = ((wy - cam.y) * zoom + H / 2) * 0.5;
      const sr = worldR * zoom * 0.5;
      if (sx + sr < 0 || sx - sr > lw || sy + sr < 0 || sy - sr > lh) return;
      const grd = lightCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      grd.addColorStop(0, 'rgba(0,0,0,' + intensity + ')');
      grd.addColorStop(0.42, 'rgba(0,0,0,' + intensity * 0.82 + ')');
      grd.addColorStop(0.75, 'rgba(0,0,0,' + intensity * 0.35 + ')');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = grd;
      lightCtx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }

    if (g) {
      const p = g.player;
      if (!p.dead) {
        const flick = 1 + Math.sin(g.t * 7.3) * 0.03 + Math.sin(g.t * 13.1) * 0.02;
        const lx = p.x + Math.cos(p.aim) * -8;
        const ly = p.y + Math.sin(p.aim) * -8;
        hole(lx, ly, 430 * flick, 1);
        hole(lx, ly, 210, 0.8);
        hole(lx, ly, 880, 0.55);
      }
      if (p.muzzle > 0) {
        hole(p.x + Math.cos(p.aim) * 28, p.y + Math.sin(p.aim) * 28, 140, 0.9);
      }
      for (const l of g.lights) {
        const k = l.life / l.maxLife;
        hole(l.x, l.y, l.r * (0.6 + k * 0.4), 0.9 * k);
      }
      for (const b of g.ebullets) {
        hole(b.x, b.y, 60, 0.5);
      }
      for (const e of g.enemies) {
        if (e.boss) hole(e.x, e.y, 220, 0.55);
        else if (e.elite) hole(e.x, e.y, 80, 0.45);
      }
      // 蜡烛
      for (const d of g.decor) {
        if (!d.lightR) continue;
        const v = viewBounds(cam.x, cam.y);
        if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
        hole(d.x, d.y, d.lightR * (0.92 + Math.sin(g.t * 8 + d.flicker) * 0.08), 0.75);
      }
    } else {
      hole(0, 0, 520, 1);
    }

    lightCtx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightCv, 0, 0, W, H);
    ctx.restore();

    // 暖色光晕
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (g) {
      const p = g.player;
      if (!p.dead) {
        const flick = 1 + Math.sin(g.t * 7.3) * 0.04;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 160 * flick);
        grd.addColorStop(0, 'rgba(255,180,100,.07)');
        grd.addColorStop(0.5, 'rgba(255,150,80,.03)');
        grd.addColorStop(1, 'rgba(255,140,70,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(p.x - 170, p.y - 170, 340, 340);
      }
    }
    ctx.restore();
  }

  function drawGlowPass(g) {
    if (!g) return;
    const cam = g.camera;
    const shake = shakeAmount(g);
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.globalCompositeOperation = 'lighter';

    const p = g.player;
    if (!p.dead) {
      // 灯笼光点
      const lx = p.x - 11 + Math.sin(p.lanternPhase * 0.7) * 2;
      const ly = p.y + 3 + Math.cos(p.lanternPhase) * 1.5;
      const grd = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30);
      grd.addColorStop(0, 'rgba(255,240,200,.6)');
      grd.addColorStop(0.25, 'rgba(255,190,110,.28)');
      grd.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(lx, ly, 30, 0, TAU); ctx.fill();
      // 枪口
      if (p.muzzle > 0) {
        const mx = p.x + Math.cos(p.aim) * 38, my = p.y + Math.sin(p.aim) * 38;
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 40);
        mg.addColorStop(0, 'rgba(255,255,240,1)');
        mg.addColorStop(0.4, 'rgba(255,210,130,.5)');
        mg.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mx, my, 40, 0, TAU); ctx.fill();
      }
    }

    // 宝石微光
    for (const gem of g.gems) {
      const s = gem.big ? 24 : 15;
      ctx.globalAlpha = 0.5;
      const grd = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, s);
      grd.addColorStop(0, gem.big ? 'rgba(255,220,130,.9)' : 'rgba(120,255,220,.8)');
      grd.addColorStop(1, 'rgba(80,200,180,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(gem.x, gem.y, s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 动态光源的辉光
    for (const l of g.lights) {
      const k = l.life / l.maxLife;
      const grd = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      grd.addColorStop(0, 'rgba(255,230,180,' + (0.35 * k) + ')');
      grd.addColorStop(0.5, 'rgba(255,160,90,' + (0.12 * k) + ')');
      grd.addColorStop(1, 'rgba(255,140,70,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill();
    }

    // 蜡烛
    for (const d of g.decor) {
      if (!d.lightR) continue;
      const v = viewBounds(cam.x, cam.y);
      if (d.x < v.x0 || d.x > v.x1 || d.y < v.y0 || d.y > v.y1) continue;
      const k = 0.7 + Math.sin(g.t * 8 + d.flicker) * 0.15;
      const grd = ctx.createRadialGradient(d.x, d.y - 6, 0, d.x, d.y - 6, d.lightR * 0.8);
      grd.addColorStop(0, 'rgba(255,200,120,' + (0.16 * k) + ')');
      grd.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(d.x, d.y - 6, d.lightR * 0.8, 0, TAU); ctx.fill();
    }

    // Boss 辉光
    if (g.boss && !g.boss.dead) {
      const b = g.boss;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 200);
      grd.addColorStop(0, 'rgba(190,60,255,.16)');
      grd.addColorStop(1, 'rgba(190,60,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(b.x, b.y, 200, 0, TAU); ctx.fill();
    }

    // 精英辉光
    for (const e of g.enemies) {
      if (!e.elite || e.boss) continue;
      const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2.4);
      grd.addColorStop(0, 'rgba(255,190,100,.14)');
      grd.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.4, 0, TAU); ctx.fill();
    }

    // 普通怪物微弱辉光：让黑暗中的轮廓可辨（低画质时省略）
    if (!qualityLow) {
      const av = viewBounds(cam.x, cam.y);
      for (const e of g.enemies) {
        if (e.boss || e.elite) continue;
        if (e.x < av.x0 || e.x > av.x1 || e.y < av.y0 || e.y > av.y1) continue;
        const aura = Art.auras[e.sprite];
        if (!aura) continue;
        const ar = e.r * 3.1;
        ctx.globalAlpha = (e.spawnT > 0 ? 0.34 : 0.5) + Math.sin(g.t * 2.4 + e.walkPhase) * 0.07;
        ctx.drawImage(aura, e.x - ar, e.y - ar, ar * 2, ar * 2);
      }
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawDamageTexts(g) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of g.texts) {
      const k = t.life / t.max;
      const sx = (t.x - g.camera.x) * zoom + W / 2;
      const sy = (t.y - g.camera.y) * zoom + H / 2;
      if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) continue;
      const size = (t.crit ? 22 : 14) * (0.8 + (1 - k) * 0.35);
      ctx.globalAlpha = Math.min(1, k * 2.2);
      ctx.font = (t.crit ? '700 ' : '600 ') + size + 'px Cinzel, serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(t.value, sx, sy);
      ctx.fillStyle = t.crit ? '#ffd97a' : t.color;
      ctx.fillText(t.value, sx, sy);
    }
    ctx.restore();
  }

  function drawDawnOverlay(g) {
    if (!g.endWin) return;
    const k = clamp(g.endT / 2.6, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grd = ctx.createLinearGradient(0, H, 0, H * 0.1);
    grd.addColorStop(0, 'rgba(255,180,100,' + (0.5 * k) + ')');
    grd.addColorStop(0.5, 'rgba(255,150,90,' + (0.16 * k) + ')');
    grd.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* =========================================================
     HUD
     ========================================================= */
  function updateHud(force) {
    if (!game) return;
    const g = game;
    const p = g.player;

    hudTick += 1;
    // 每帧更新血条/冲刺，其他节流
    $('hud-hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    $('hud-hp-lag').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    $('hud-hp-text').textContent = Math.max(0, Math.ceil(p.hp)) + ' / ' + Math.round(p.maxHp);
    const dashPct = p.dashCd <= 0 ? 100 : (1 - p.dashCd / (p.dashCdMax * p.dashCdMult)) * 100;
    $('dash-ring').style.setProperty('--dash-pct', dashPct + '%');
    $('hud-dash').classList.toggle('ready', p.dashCd <= 0);

    if (!force && hudTick % 4 !== 0) return;

    $('hud-level').textContent = g.level;
    $('hud-xp-fill').style.width = clamp(g.xp / g.xpNext * 100, 0, 100) + '%';
    $('hud-kills').textContent = fmtNum(g.kills);

    const remaining = Math.max(0, g.duration - g.t);
    $('hud-time').textContent = fmtTime(remaining);
    $('hud-time').classList.toggle('danger', remaining <= 60);
    $('hud-night-fill').style.width = clamp(g.t / g.duration * 100, 0, 100) + '%';

    const prog = g.t / g.duration;
    let phase = '长夜';
    if (prog > 0.85) phase = '黎明将至';
    else if (prog > 0.65) phase = '残夜';
    else if (prog > 0.35) phase = '深夜';
    $('hud-phase').textContent = phase;

    if (g.boss && !g.boss.dead) {
      bossFill.style.width = clamp(g.boss.hp / g.boss.maxHp * 100, 0, 100) + '%';
    }
  }

  /* =========================================================
     调试接口
     ========================================================= */
  window.__game = {
    get state() { return state; },
    get g() { return game; },
    get settings() { return settings; },
    get meta() { return meta; },
    start: (m, w) => startGame(m || 'standard', w),
    menu: () => goMenu(),
    win: () => { if (game) { game.t = game.duration - 0.01; } },
    addTime: s => { if (game) game.t += s; },
    addXp: n => { if (game) gainXp(n); },
    spawnBoss: () => { if (game) spawnBoss(0); },
    killAll: () => {
      if (!game) return;
      for (const e of game.enemies) if (!e.dead) killEnemy(e);
    },
    hurt: n => { if (game) damagePlayer(n || 20); },
    levelUp: () => { if (game) { game.pendingLevels++; openLevelUp(); } },
    spawn: (t, n) => {
      if (!game) return;
      for (let i = 0; i < (n || 1); i++) {
        const a = Math.random() * TAU, d = 300;
        spawnEnemy(t || 'ghoul', game.player.x + Math.cos(a) * d, game.player.y + Math.sin(a) * d, false);
      }
    },
    // 无头测试用：手动推进若干帧
    step: (dt, n) => {
      dt = dt || 1 / 60;
      n = n || 1;
      for (let i = 0; i < n; i++) {
        if (state === 'playing') update(dt, dt);
        else if (state === 'ending') { game.endT += dt; updateEffects(dt); updateEnding(dt); }
        updateHud(false);
      }
      render(dt);
    },
    renderOnce: () => render(1 / 60),
    hud: () => updateHud(true),
    setZoom: z => { zoom = z; },
    getZoom: () => zoom,
    setGround: on => {
      groundPattern = on ? ctx.createPattern(Art.ground, 'repeat') : null;
      render(1 / 60);
    }
  };

  /* =========================================================
     启动
     ========================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
