/* 长夜将尽 · Procedural rain, wet ground and signal lanterns. No assets or DOM required. */
window.Atmosphere = (function () {
  'use strict';
  const TAU = Math.PI * 2;
  const LIMITS = Object.freeze({ rain: 128, ripples: 36, puddles: 72, lowRain: 40, lowRipples: 12, maxDt: 0.05 });
  const ARENA_RADIUS = 1500;

  function random(scene) {
    scene.seed = (scene.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(scene.seed ^ (scene.seed >>> 15), 1 | scene.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function create(seed) {
    const scene = { seed: Number(seed) | 0, rain: [], ripples: [], puddles: [], time: 0, lastDt: 0 };
    for (let i = 0; i < LIMITS.rain; i++) {
      scene.rain.push({ x: random(scene), y: random(scene), speed: 280 + random(scene) * 230,
        length: 6 + random(scene) * 10, alpha: 0.045 + random(scene) * 0.055 });
    }
    // A jittered golden-angle spiral distributes water over the entire circular arena.
    for (let i = 0; i < LIMITS.puddles; i++) {
      const a = i * 2.3999632297 + random(scene) * 0.5;
      const r = Math.sqrt((i + 0.5) / LIMITS.puddles) * (ARENA_RADIUS - 110);
      const puddle = { x: Math.cos(a) * r, y: Math.sin(a) * r, rx: 25 + random(scene) * 38,
        ry: 10 + random(scene) * 14, angle: random(scene) * 0.55 - 0.275, phase: random(scene) * TAU, shore: [] };
      for (let point = 0; point < 10; point++) puddle.shore.push(shorePoint(puddle, point));
      scene.puddles.push(puddle);
    }
    for (let i = 0; i < LIMITS.ripples; i++) {
      scene.ripples.push({ puddle: i * 2, x: (random(scene) - 0.5) * 0.9,
        y: (random(scene) - 0.5) * 0.8, age: random(scene) * 1.8, life: 1.8 + random(scene) * 1.2 });
    }
    return scene;
  }

  function positive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function update(scene, dt, options) {
    options = options || {};
    if (options.reduceMotion || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, LIMITS.maxDt);
    scene.lastDt = dt;
    scene.time = (scene.time + dt) % 4096;
    const width = positive(options.width, 960), height = positive(options.height, 540);
    const rainCount = options.low ? LIMITS.lowRain : LIMITS.rain;
    for (let i = 0; i < rainCount; i++) {
      const drop = scene.rain[i];
      drop.x = (drop.x + drop.speed * 0.22 * dt / width) % 1;
      drop.y = (drop.y + drop.speed * dt / height) % 1;
    }
    const rippleCount = options.low ? LIMITS.lowRipples : LIMITS.ripples;
    for (let i = 0; i < rippleCount; i++) {
      const ripple = scene.ripples[i];
      ripple.age += dt;
      if (ripple.age >= ripple.life) {
        ripple.age %= ripple.life;
        ripple.puddle = Math.floor(random(scene) * scene.puddles.length);
        ripple.x = (random(scene) - 0.5) * 0.9;
        ripple.y = (random(scene) - 0.5) * 0.8;
      }
    }
  }

  // SCREEN space: call after restoring the world transform. No tint or opaque veil.
  function drawWeather(ctx, scene, options) {
    options = options || {};
    if (options.reduceMotion) return;
    const width = positive(options.width, 960), height = positive(options.height, 540);
    const count = options.low ? LIMITS.lowRain : LIMITS.rain;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#adc8d6';
    for (let i = 0; i < count; i++) {
      const drop = scene.rain[i];
      const x = drop.x * width, y = drop.y * height;
      ctx.globalAlpha = drop.alpha;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + drop.length * 0.22, y + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  // Ten deterministic shoreline points are cached during create, not allocated per frame.
  function shorePoint(puddle, index) {
    const a = index * TAU / 10;
    const wobble = 1 + Math.sin(a * 3 + puddle.phase) * 0.12 + Math.cos(a * 5 - puddle.phase) * 0.06;
    return { x: Math.cos(a) * puddle.rx * wobble, y: Math.sin(a) * puddle.ry * wobble };
  }

  function shore(ctx, puddle) {
    const points = puddle.shore;
    let current = points[0];
    const previous = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo((previous.x + current.x) / 2, (previous.y + current.y) / 2);
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
      current = next;
    }
    ctx.closePath();
  }

  // WORLD space: invoke under enemies, inside the existing camera/zoom transform.
  // camera and zoom are culling inputs only; the renderer never applies them again.
  function drawPuddles(ctx, scene, options) {
    options = options || {};
    const zoom = positive(options.zoom, 1);
    const halfW = positive(options.width, 960) / (2 * zoom);
    const halfH = positive(options.height, 540) / (2 * zoom);
    const cx = finite(options.cameraX, 0), cy = finite(options.cameraY, 0);
    const t = options.reduceMotion ? 0 : finite(options.time, scene.time);
    const rippleCount = options.low ? LIMITS.lowRipples : LIMITS.ripples;
    let saved = false;
    for (let i = 0; i < scene.puddles.length; i++) {
      const p = scene.puddles[i];
      if (Math.abs(p.x - cx) > halfW + p.rx * 1.2 || Math.abs(p.y - cy) > halfH + p.rx * 1.2) continue;
      if (!saved) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        saved = true;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      shore(ctx, p);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#060f19';
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#8cabb9';
      ctx.stroke();
      ctx.clip();
      // Faint blue sky reflection, then broken silver bands like light on wet slate.
      if (!options.low) {
        const reflection = ctx.createLinearGradient(0, -p.ry, p.rx * 0.15, p.ry);
        reflection.addColorStop(0, 'rgba(128,169,197,0)');
        reflection.addColorStop(0.36, 'rgba(128,169,197,0.34)');
        reflection.addColorStop(0.6, 'rgba(71,104,126,0.18)');
        reflection.addColorStop(1, 'rgba(18,30,43,0)');
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = reflection;
        ctx.fillRect(-p.rx * 1.2, -p.ry * 1.2, p.rx * 2.4, p.ry * 2.4);
        ctx.strokeStyle = '#a2c0cd';
        ctx.lineWidth = 0.65;
        for (let band = 0; band < 3; band++) {
          const shimmer = Math.sin(t * 0.75 + p.phase + band) * 0.8;
          const y = (band - 1) * p.ry * 0.36 + shimmer;
          ctx.globalAlpha = 0.065 + band * 0.012;
          ctx.beginPath();
          ctx.moveTo(-p.rx * (0.5 - band * 0.1), y);
          ctx.quadraticCurveTo(0, y + 0.8, p.rx * (0.35 + band * 0.1), y - 0.6);
          ctx.stroke();
        }
      }
      if (!options.reduceMotion) {
        for (let j = 0; j < rippleCount; j++) {
          const ripple = scene.ripples[j];
          if (ripple.puddle !== i) continue;
          const progress = ripple.age / ripple.life;
          const radius = 1 + progress * 16;
          ctx.globalAlpha = (1 - progress) * 0.15;
          ctx.strokeStyle = '#b0ccd6';
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.ellipse(ripple.x * p.rx, ripple.y * p.ry, radius, radius * 0.42, 0, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (saved) ctx.restore();
  }

  // Pure world-space circle/viewport intersection, including the game's 200-unit light hole.
  // Call before drawBeacon to avoid creating gradients for wholly invisible lanterns.
  function beaconVisible(beacon, options) {
    beacon = beacon || {};
    options = options || {};
    const zoom = positive(options.zoom, 1);
    const halfW = positive(options.width, 960) / (2 * zoom);
    const halfH = positive(options.height, 540) / (2 * zoom);
    const dx = Math.max(0, Math.abs(finite(beacon.x, 0) - finite(options.cameraX, 0)) - halfW);
    const dy = Math.max(0, Math.abs(finite(beacon.y, 0) - finite(options.cameraY, 0)) - halfH);
    return dx * dx + dy * dy <= 200 * 200;
  }

  function ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  }

  // WORLD space: a grounded iron signal lantern, not a floating UI marker.
  // A completed objective stays warmly lit, with no sway/flicker or charging indicator.
  function drawBeacon(ctx, beacon, time, reduceMotion) {
    beacon = beacon || {};
    const x = finite(beacon.x, 0), y = finite(beacon.y, 0);
    const radius = positive(beacon.radius, 90);
    const charge = Math.max(0, Math.min(1, finite(beacon.charge, 0)));
    const done = !!beacon.done;
    const t = reduceMotion || done ? 0 : finite(time, 0) % 4096;
    const flicker = done ? 1 : 0.95 + Math.sin(t * 4.3 + x * 0.01) * 0.035 + Math.sin(t * 7.1) * 0.015;
    const sway = reduceMotion || done ? 0 : Math.sin(t * 1.6 + y * 0.01) * 0.025;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Broad light stays at ground level; completed lanterns keep the same warm pool.
    const glow = ctx.createRadialGradient(0, 6, 2, 0, 6, radius * 1.32);
    glow.addColorStop(0, 'rgba(245,163,66,0.25)');
    glow.addColorStop(0.32, 'rgba(225,133,48,0.10)');
    glow.addColorStop(1, 'rgba(194,107,35,0)');
    ctx.globalAlpha = flicker;
    ctx.fillStyle = glow;
    ellipse(ctx, 0, 6, radius * 1.32, radius * 0.72);
    ctx.fill();
    if (!done) {
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cdaa69';
      ctx.beginPath();
      ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      // Unambiguous progress sweep, independent from flame animation.
      if (charge > 0) {
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#f3c374';
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + charge * TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#d3b178';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 - Math.PI / 2;
        ctx.moveTo(Math.cos(a) * (radius + 4), Math.sin(a) * (radius + 4));
        ctx.lineTo(Math.cos(a) * (radius + 7), Math.sin(a) * (radius + 7));
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#02080e';
    ellipse(ctx, 5, 13, 29, 10);
    ctx.fill();
    // Chipped stone plinth and the iron post catch a cool night rim.
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#202931';
    ctx.beginPath();
    ctx.moveTo(-22, 7); ctx.lineTo(-17, 3); ctx.lineTo(17, 3);
    ctx.lineTo(23, 8); ctx.lineTo(19, 17); ctx.lineTo(-18, 17); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#53616a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-20, 7); ctx.lineTo(0, 5); ctx.lineTo(20, 8); ctx.stroke();
    ctx.fillStyle = '#111921';
    ctx.fillRect(-5, -19, 10, 26);
    ctx.strokeStyle = '#5b645f';
    ctx.beginPath(); ctx.moveTo(-4, -17); ctx.lineTo(-4, 4); ctx.stroke();
    ctx.fillStyle = '#1a232b';
    ctx.fillRect(-13, -20, 26, 5);
    ctx.fillRect(-10, 1, 20, 4);

    // Lantern gently pivots around the top suspension, never its objective ring.
    ctx.save();
    ctx.translate(0, -61);
    ctx.rotate(sway);
    ctx.translate(0, 61);
    ctx.strokeStyle = '#7a7970';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -61, 4, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = '#1a242b';
    ctx.beginPath();
    ctx.moveTo(-15, -49); ctx.lineTo(-9, -56); ctx.lineTo(0, -59);
    ctx.lineTo(9, -56); ctx.lineTo(15, -49); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = done ? '#5c6972' : '#9a947e';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-14, -49); ctx.lineTo(0, -51); ctx.lineTo(14, -49); ctx.stroke();
    ctx.fillStyle = '#0d151d';
    ctx.fillRect(-12, -49, 24, 31);

    // Narrow amber glass, with a pale flame core and copper reflection.
    ctx.fillStyle = '#6f4928';
    ctx.fillRect(-9, -46, 18, 25);
    {
      const halo = ctx.createRadialGradient(0, -32, 1, 0, -32, 40);
      halo.addColorStop(0, 'rgba(255,223,144,0.64)');
      halo.addColorStop(0.28, 'rgba(241,162,57,0.30)');
      halo.addColorStop(1, 'rgba(212,123,34,0)');
      ctx.fillStyle = halo;
      ctx.globalAlpha = flicker;
      ellipse(ctx, 0, -32, 35, 42); ctx.fill();
      ctx.fillStyle = '#efad55';
      ctx.beginPath();
      ctx.moveTo(-5, -26);
      ctx.bezierCurveTo(-8, -33, -1, -37, 1 + Math.sin(t * 3) * 0.7, -42);
      ctx.bezierCurveTo(2, -36, 8, -31, 4, -26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff0be';
      ellipse(ctx, 0, -29, 2.2, 5.5 * flicker); ctx.fill();
    }
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffedba';
    ctx.fillRect(-7, -44, 1.4, 20);
    ctx.fillRect(5, -44, 0.7, 15);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#242b2e';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-11, -48); ctx.lineTo(-10, -20);
    ctx.moveTo(11, -48); ctx.lineTo(10, -20);
    ctx.moveTo(-10, -45); ctx.lineTo(10, -24);
    ctx.moveTo(10, -45); ctx.lineTo(-10, -24);
    ctx.stroke();
    ctx.fillStyle = '#222a2d';
    ctx.fillRect(-13, -22, 26, 4);
    ctx.strokeStyle = done ? '#52636c' : '#a88b5e';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-12, -21); ctx.lineTo(12, -21); ctx.stroke();
    ctx.restore();

    if (done) {
      // A steady check seal marks completion without a charging/activation prompt.
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#182f35';
      ellipse(ctx, 0, 9, 7, 7); ctx.fill();
      ctx.strokeStyle = '#91b7aa';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-3, 9); ctx.lineTo(-0.5, 11.5); ctx.lineTo(3.5, 6.5); ctx.stroke();
    }
    ctx.restore();
  }

  function budget(scene) {
    return { rain: scene.rain.length, ripples: scene.ripples.length, puddles: scene.puddles.length,
      limits: LIMITS, lastDt: scene.lastDt };
  }

  return Object.freeze({ create: create, update: update, drawWeather: drawWeather,
    drawPuddles: drawPuddles, drawBeacon: drawBeacon, beaconVisible: beaconVisible, budget: budget });
}());
