/* =========================================================
   长夜将尽 · Art
   所有美术资源均由 Canvas 程序化绘制并预渲染
   ========================================================= */
window.Art = (function () {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------- 基础工具 ---------- */
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 以 size 为逻辑尺寸、ss 为超采样倍率创建精灵
  function sprite(size, drawFn, ss) {
    ss = ss || 2;
    const c = makeCanvas(size * ss, size * ss);
    const ctx = c.getContext('2d');
    ctx.scale(ss, ss);
    ctx.translate(size / 2, size / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawFn(ctx, mulberry32(1337));
    return c;
  }

  function flashVersion(src, alpha) {
    const c = makeCanvas(src.width, src.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,248,235,' + (alpha == null ? 0.82 : alpha) + ')';
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // 不规则圆滑闭合路径
  function blobPath(ctx, r, points, jitter, rng, squash) {
    squash = squash || 1;
    const pts = [];
    for (let i = 0; i < points; i++) {
      const a = (i / points) * TAU;
      const rr = r * (1 - jitter + rng() * jitter * 2);
      pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * squash });
    }
    ctx.beginPath();
    const mx = (pts[0].x + pts[points - 1].x) / 2;
    const my = (pts[0].y + pts[points - 1].y) / 2;
    ctx.moveTo(mx, my);
    for (let i = 0; i < points; i++) {
      const p = pts[i], n = pts[(i + 1) % points];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
    }
    ctx.closePath();
  }

  function glowEllipse(ctx, x, y, rx, ry, color, blur) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     怪物精灵
     ========================================================= */
  const R = 30; // 精灵内部基准半径

  function drawGhoul(ctx, rng) {
    // 手臂
    ctx.strokeStyle = '#1b231c';
    ctx.lineWidth = 6.5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 13, 4);
      ctx.quadraticCurveTo(s * 26, -4, s * 27, 12);
      ctx.stroke();
      ctx.strokeStyle = '#2a3628';
      ctx.lineWidth = 2.2;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(s * 27, 12);
        ctx.lineTo(s * (30 + k * 2), 18 + k * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#1b231c';
      ctx.lineWidth = 6.5;
    }
    // 身体
    ctx.save();
    ctx.shadowColor = 'rgba(120,220,160,.28)';
    ctx.shadowBlur = 20;
    const g = ctx.createRadialGradient(-8, -12, 4, 0, 0, R * 1.15);
    g.addColorStop(0, '#66755c');
    g.addColorStop(0.45, '#39452f');
    g.addColorStop(1, '#11160f');
    ctx.fillStyle = g;
    blobPath(ctx, R * 0.92, 11, 0.13, rng, 1.05);
    ctx.fill();
    ctx.restore();
    // 破布边缘
    ctx.strokeStyle = 'rgba(12,16,11,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = 0.3 + i * 0.28;
      const rr = R * 0.86;
      ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.lineTo(Math.cos(a) * (rr + 8 + rng() * 7), Math.sin(a) * (rr + 8 + rng() * 7));
    }
    ctx.stroke();
    // 面部
    ctx.fillStyle = '#0a0d09';
    ctx.beginPath();
    ctx.ellipse(6, -2, 15, 12, 0.15, 0, TAU);
    ctx.fill();
    // 眼睛
    glowEllipse(ctx, 1, -6, 3.2, 2.4, '#d9ffb0', 12);
    glowEllipse(ctx, 11, -4, 2.8, 2.1, '#d9ffb0', 12);
    // 嘴
    ctx.strokeStyle = '#c9e8a0';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, 7);
    for (let i = 0; i < 4; i++) ctx.lineTo(2 + i * 4.2, 7 + (i % 2 ? 2.4 : -0.6));
    ctx.stroke();
    // 月光边缘
    ctx.strokeStyle = 'rgba(168,220,255,.22)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.9, Math.PI * 1.05, Math.PI * 1.62);
    ctx.stroke();
  }

  function drawStalker(ctx, rng) {
    // 四肢
    ctx.strokeStyle = '#1c0c12';
    ctx.lineWidth = 4.5;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const bx = s * (6 + i * 6), by = 6 + i * 3;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + s * 10, by + 8, bx + s * (14 + i * 2), by + 17);
        ctx.stroke();
      }
    }
    // 身体
    ctx.save();
    ctx.shadowColor = 'rgba(255,50,80,.4)';
    ctx.shadowBlur = 22;
    const g = ctx.createLinearGradient(-26, -10, 24, 12);
    g.addColorStop(0, '#18070d');
    g.addColorStop(0.55, '#3d0f1c');
    g.addColorStop(1, '#1a070c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.22, R * 0.66, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 脊背尖刺
    ctx.fillStyle = '#2b0a14';
    for (let i = 0; i < 5; i++) {
      const x = -18 + i * 8;
      ctx.beginPath();
      ctx.moveTo(x, -11);
      ctx.lineTo(x + 4, -22 - (i % 2) * 5);
      ctx.lineTo(x + 8, -10);
      ctx.closePath();
      ctx.fill();
    }
    // 单眼
    glowEllipse(ctx, 13, -3, 4.6, 4.6, '#ff3355', 18);
    ctx.fillStyle = '#2b0008';
    ctx.beginPath(); ctx.ellipse(13, -3, 1.4, 3.4, 0, 0, TAU); ctx.fill();
    // 速度残影
    ctx.strokeStyle = 'rgba(255,60,90,.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-20 - i * 5, -4 + i * 5);
      ctx.lineTo(-38 - i * 7, -4 + i * 5);
      ctx.stroke();
    }
  }

  function drawBrute(ctx, rng) {
    // 巨拳
    ctx.fillStyle = '#2a2118';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 30, 16, 13, 15, s * 0.25, 0, TAU);
      ctx.fill();
    }
    // 身体
    ctx.save();
    ctx.shadowColor = 'rgba(255,150,70,.24)';
    ctx.shadowBlur = 24;
    const g = ctx.createRadialGradient(-10, -16, 6, 0, 0, R * 1.5);
    g.addColorStop(0, '#6a5540');
    g.addColorStop(0.5, '#3a2c20');
    g.addColorStop(1, '#150f0b');
    ctx.fillStyle = g;
    blobPath(ctx, R * 1.28, 13, 0.1, rng, 0.95);
    ctx.fill();
    ctx.restore();
    // 岩甲
    ctx.fillStyle = 'rgba(90,76,58,.55)';
    ctx.strokeStyle = 'rgba(20,14,9,.7)';
    ctx.lineWidth = 1.5;
    const plates = [[-14, -20, 13, 8, -0.4], [8, -26, 11, 7, 0.3], [-24, 2, 10, 7, 0.7], [16, 6, 12, 8, -0.2]];
    for (const p of plates) {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2], p[3], p[4], 0, TAU);
      ctx.fill(); ctx.stroke();
    }
    // 角
    ctx.fillStyle = '#cfc0a2';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 18, -30);
      ctx.quadraticCurveTo(s * 34, -52, s * 20, -58);
      ctx.quadraticCurveTo(s * 30, -42, s * 10, -26);
      ctx.closePath();
      ctx.fill();
    }
    // 三只眼
    glowEllipse(ctx, -10, -8, 3.6, 3.2, '#ffb066', 14);
    glowEllipse(ctx, 4, -12, 3.2, 2.8, '#ffb066', 14);
    glowEllipse(ctx, 16, -5, 3.0, 2.6, '#ff8a4d', 14);
    // 嘴
    ctx.strokeStyle = '#0d0906';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 14); ctx.quadraticCurveTo(2, 22, 14, 12);
    ctx.stroke();
    // 高光
    ctx.strokeStyle = 'rgba(255,220,180,.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.2, Math.PI * 1.1, Math.PI * 1.55);
    ctx.stroke();
  }

  function drawSpitter(ctx, rng) {
    // 触须
    ctx.strokeStyle = '#182219';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const a = 0.6 + i * 0.42;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.quadraticCurveTo(Math.cos(a) * 30, Math.sin(a) * 30 + 8, Math.cos(a) * 38, Math.sin(a) * 34 + 12);
      ctx.stroke();
    }
    // 身体
    ctx.save();
    ctx.shadowColor = 'rgba(140,255,110,.3)';
    ctx.shadowBlur = 22;
    const g = ctx.createRadialGradient(-8, -12, 4, 0, 0, R * 1.2);
    g.addColorStop(0, '#586b45');
    g.addColorStop(0.5, '#2d3a24');
    g.addColorStop(1, '#10150d');
    ctx.fillStyle = g;
    blobPath(ctx, R * 1.02, 12, 0.1, rng, 1.02);
    ctx.fill();
    ctx.restore();
    // 毒囊
    glowEllipse(ctx, -10, 10, 9, 8, 'rgba(150,255,110,.35)', 16);
    ctx.fillStyle = 'rgba(160,255,120,.22)';
    ctx.beginPath(); ctx.ellipse(-10, 10, 7, 6, 0, 0, TAU); ctx.fill();
    // 裂口
    ctx.fillStyle = '#070a05';
    ctx.beginPath();
    ctx.ellipse(8, 2, 14, 10, 0.1, 0, TAU);
    ctx.fill();
    // 牙
    ctx.fillStyle = '#cfe8a8';
    for (let i = 0; i < 6; i++) {
      const x = -2 + i * 4;
      ctx.beginPath();
      ctx.moveTo(x, -5); ctx.lineTo(x + 1.8, 2); ctx.lineTo(x + 3.4, -5);
      ctx.closePath(); ctx.fill();
    }
    glowEllipse(ctx, 8, 3, 6, 3, 'rgba(150,255,110,.45)', 16);
  }

  function drawSwarm(ctx, rng) {
    // 腿
    ctx.strokeStyle = '#170d10';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 3, -2 + i * 3);
        ctx.lineTo(s * 12, -8 + i * 7);
        ctx.stroke();
      }
    }
    // 翅
    ctx.fillStyle = 'rgba(180,200,255,.12)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 6, -8, 9, 4.5, s * 0.6, 0, TAU);
      ctx.fill();
    }
    // 身体
    ctx.save();
    ctx.shadowColor = 'rgba(255,60,80,.45)';
    ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 12);
    g.addColorStop(0, '#3c1820');
    g.addColorStop(1, '#0b0507');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 7.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    glowEllipse(ctx, 4, -2, 2.2, 2.2, '#ff4a63', 10);
  }

  function drawWraith(ctx, rng) {
    // 尾焰
    const g = ctx.createLinearGradient(0, -30, 0, 34);
    g.addColorStop(0, 'rgba(150,210,255,.05)');
    g.addColorStop(0.55, 'rgba(120,180,255,.35)');
    g.addColorStop(1, 'rgba(60,90,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.quadraticCurveTo(-26, 20, -10, 34);
    ctx.quadraticCurveTo(-2, 24, 0, 36);
    ctx.quadraticCurveTo(4, 22, 12, 32);
    ctx.quadraticCurveTo(24, 16, 13, -6);
    ctx.closePath();
    ctx.fill();
    // 主体
    ctx.save();
    ctx.shadowColor = 'rgba(130,200,255,.55)';
    ctx.shadowBlur = 26;
    const g2 = ctx.createRadialGradient(-4, -8, 2, 0, 0, 24);
    g2.addColorStop(0, 'rgba(225,245,255,.9)');
    g2.addColorStop(0.35, 'rgba(130,190,255,.55)');
    g2.addColorStop(1, 'rgba(50,80,170,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.ellipse(0, -4, 16, 20, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 面具
    ctx.fillStyle = 'rgba(230,242,255,.82)';
    ctx.beginPath();
    ctx.ellipse(1, -8, 9.5, 11, 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a1220';
    ctx.beginPath(); ctx.ellipse(-2.5, -10, 2.2, 3.2, 0.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -10, 2.2, 3.2, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(10,18,32,.8)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.quadraticCurveTo(1, 0, 5, -2); ctx.stroke();
    // 飘带
    ctx.strokeStyle = 'rgba(180,225,255,.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-10 + i * 9, 8);
      ctx.quadraticCurveTo(-18 + i * 12, 22, -6 + i * 8, 34);
      ctx.stroke();
    }
  }

  function drawBoss(ctx, rng) {
    // 触手
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.2;
      const len = 74 + (i % 3) * 14;
      const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
      const mx = Math.cos(a + 0.5) * len * 0.62;
      const my = Math.sin(a + 0.5) * len * 0.62;
      ctx.strokeStyle = i % 2 ? '#2a0c20' : '#37102a';
      ctx.lineWidth = 9 - (i % 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 34, Math.sin(a) * 34);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      glowEllipse(ctx, ex, ey, 2.4, 2.4, 'rgba(220,90,255,.6)', 12);
    }
    // 主体
    ctx.save();
    ctx.shadowColor = 'rgba(190,60,255,.4)';
    ctx.shadowBlur = 40;
    const g = ctx.createRadialGradient(-20, -28, 10, 0, 0, 86);
    g.addColorStop(0, '#6b3550');
    g.addColorStop(0.45, '#3a1528');
    g.addColorStop(1, '#12060d');
    ctx.fillStyle = g;
    blobPath(ctx, 74, 15, 0.09, rng, 0.98);
    ctx.fill();
    ctx.restore();
    // 裂口
    ctx.strokeStyle = 'rgba(10,3,8,.8)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * 54, Math.sin(a + 0.3) * 54, Math.cos(a + 0.1) * 72, Math.sin(a + 0.1) * 72);
      ctx.stroke();
    }
    // 主眼
    ctx.save();
    ctx.shadowColor = 'rgba(255,220,120,.85)';
    ctx.shadowBlur = 34;
    const eg = ctx.createRadialGradient(0, -6, 2, 0, -4, 26);
    eg.addColorStop(0, '#fff4cf');
    eg.addColorStop(0.4, '#ffcf6b');
    eg.addColorStop(1, '#8a3a10');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(0, -4, 25, 21, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#150306';
    ctx.beginPath();
    ctx.ellipse(2, -4, 5, 17, 0.06, 0, TAU);
    ctx.fill();
    // 副眼
    for (const p of [[-38, -34, 5], [36, -30, 4], [-46, 20, 3.5], [44, 26, 4.5], [0, 44, 4]]) {
      glowEllipse(ctx, p[0], p[1], p[2], p[2] * 0.85, '#ff7a9a', 16);
      ctx.fillStyle = '#20040a';
      ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2] * 0.28, p[2] * 0.7, 0, 0, TAU); ctx.fill();
    }
    // 嘴
    ctx.fillStyle = '#0a0206';
    ctx.beginPath();
    ctx.ellipse(0, 46, 26, 13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8d8c0';
    for (let i = 0; i < 9; i++) {
      const x = -22 + i * 5.5;
      ctx.beginPath();
      ctx.moveTo(x, 34); ctx.lineTo(x + 2, 44); ctx.lineTo(x + 4, 34);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, 57); ctx.lineTo(x + 2, 48); ctx.lineTo(x + 4, 57);
      ctx.closePath(); ctx.fill();
    }
    // 角冠
    ctx.fillStyle = '#d8c2a2';
    for (let i = -2; i <= 2; i++) {
      const x = i * 22, h = 26 - Math.abs(i) * 5;
      ctx.beginPath();
      ctx.moveTo(x - 6, -58);
      ctx.quadraticCurveTo(x + i * 4, -58 - h - 12, x + 6, -58);
      ctx.closePath();
      ctx.fill();
    }
  }

  const ENEMY_DRAW = {
    ghoul: drawGhoul,
    stalker: drawStalker,
    brute: drawBrute,
    spitter: drawSpitter,
    swarm: drawSwarm,
    wraith: drawWraith,
    boss: drawBoss
  };

  // 精英版：叠加暖金色光晕与更亮的轮廓
  function makeElite(src) {
    const c = makeCanvas(src.width, src.height);
    const ctx = c.getContext('2d');
    // 外发光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(6px)';
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, 'rgba(255,190,90,.34)');
    g.addColorStop(0.5, 'rgba(255,120,60,.16)');
    g.addColorStop(1, 'rgba(180,40,20,.2)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }

  function buildEnemySprites() {
    const out = {};
    for (const key in ENEMY_DRAW) {
      const size = key === 'boss' ? 260 : 132;
      const img = sprite(size, ENEMY_DRAW[key], key === 'boss' ? 2 : 2);
      out[key] = {
        img: img,
        elite: makeElite(img),
        flash: flashVersion(img, 0.8),
        eliteFlash: flashVersion(makeElite(img), 0.9),
        bodyR: key === 'boss' ? 74 : R,
        size: size
      };
    }
    return out;
  }

  /* =========================================================
     怪物辉光（用于暗场中保持可读性）
     ========================================================= */
  const AURA_COLORS = {
    ghoul:   [130, 230, 170],
    stalker: [255, 80, 110],
    brute:   [255, 170, 90],
    spitter: [150, 255, 120],
    swarm:   [255, 90, 110],
    wraith:  [150, 210, 255],
    boss:    [190, 80, 255]
  };

  function buildAuras() {
    const out = {};
    for (const key in AURA_COLORS) {
      const c = AURA_COLORS[key];
      out[key] = sprite(96, (ctx) => {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
        g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.34)');
        g.addColorStop(0.45, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.15)');
        g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(-48, -48, 96, 96);
      }, 2);
    }
    return out;
  }

  /* =========================================================
     地面 / 装饰 / 雾气 / 血迹
     ========================================================= */
  function buildGround() {
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const rng = mulberry32(90210);

    // 底色
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#18212a');
    g.addColorStop(0.5, '#1b242e');
    g.addColorStop(1, '#151c24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // 大块斑驳
    for (let i = 0; i < 26; i++) {
      const x = rng() * S, y = rng() * S, r = 30 + rng() * 90;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.025 + rng() * 0.045;
      rg.addColorStop(0, 'rgba(' + (30 + rng() * 25 | 0) + ',' + (45 + rng() * 25 | 0) + ',' + (48 + rng() * 30 | 0) + ',' + a + ')');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 细碎噪点
    for (let i = 0; i < 2600; i++) {
      const x = rng() * S, y = rng() * S;
      const v = rng();
      ctx.fillStyle = v > 0.6
        ? 'rgba(140,170,160,' + (0.015 + rng() * 0.05) + ')'
        : 'rgba(0,0,0,' + (0.05 + rng() * 0.16) + ')';
      const s = rng() > 0.92 ? 2 : 1;
      ctx.fillRect(x, y, s, s);
    }

    // 草簇
    for (let i = 0; i < 90; i++) {
      const x = rng() * S, y = rng() * S;
      ctx.strokeStyle = 'rgba(48,66,52,' + (0.18 + rng() * 0.3) + ')';
      ctx.lineWidth = 0.8 + rng() * 0.7;
      const blades = 2 + (rng() * 4 | 0);
      for (let b = 0; b < blades; b++) {
        ctx.beginPath();
        ctx.moveTo(x + b * 1.5 - blades, y);
        ctx.quadraticCurveTo(x + b * 2 - blades + (rng() - 0.5) * 5, y - 4 - rng() * 7, x + b * 2.5 - blades + (rng() - 0.5) * 9, y - 6 - rng() * 9);
        ctx.stroke();
      }
    }

    // 碎石
    for (let i = 0; i < 55; i++) {
      const x = rng() * S, y = rng() * S, r = 1.5 + rng() * 4.5;
      ctx.fillStyle = 'rgba(' + (36 + rng() * 24 | 0) + ',' + (40 + rng() * 24 | 0) + ',' + (42 + rng() * 22 | 0) + ',' + (0.35 + rng() * 0.35) + ')';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + rng() * 0.4), rng() * 3, 0, TAU);
      ctx.fill();
    }

    // 裂纹
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    for (let i = 0; i < 8; i++) {
      let x = rng() * S, y = rng() * S;
      ctx.lineWidth = 0.7 + rng() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (rng() - 0.5) * 34;
        y += (rng() - 0.5) * 34;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    return c;
  }

  function buildFog() {
    const out = [];
    for (let v = 0; v < 3; v++) {
      const S = 256;
      const c = makeCanvas(S, S);
      const ctx = c.getContext('2d');
      const rng = mulberry32(500 + v * 77);
      for (let i = 0; i < 10; i++) {
        const x = S / 2 + (rng() - 0.5) * 90;
        const y = S / 2 + (rng() - 0.5) * 70;
        const r = 34 + rng() * 54;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(150,180,205,' + (0.10 + rng() * 0.10) + ')');
        g.addColorStop(0.5, 'rgba(120,150,180,' + (0.05 + rng() * 0.05) + ')');
        g.addColorStop(1, 'rgba(100,130,160,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      out.push(c);
    }
    return out;
  }

  function buildDecals() {
    const out = [];
    for (let v = 0; v < 5; v++) {
      const S = 128;
      const c = makeCanvas(S, S);
      const ctx = c.getContext('2d');
      const rng = mulberry32(900 + v * 31);
      const cx = S / 2, cy = S / 2;
      // 主溅射
      for (let i = 0; i < 9; i++) {
        const a = rng() * TAU, d = rng() * 26;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const r = 5 + rng() * 18;
        ctx.fillStyle = 'rgba(' + (60 + rng() * 30 | 0) + ',' + (8 + rng() * 12 | 0) + ',' + (18 + rng() * 14 | 0) + ',' + (0.25 + rng() * 0.3) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (0.5 + rng() * 0.6), rng() * 3, 0, TAU);
        ctx.fill();
      }
      // 飞溅小点
      for (let i = 0; i < 26; i++) {
        const a = rng() * TAU, d = 24 + rng() * 34;
        const r = 0.8 + rng() * 2.6;
        ctx.fillStyle = 'rgba(90,12,26,' + (0.18 + rng() * 0.35) + ')';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, TAU);
        ctx.fill();
      }
      out.push(c);
    }
    return out;
  }

  function buildDecorations() {
    const deco = {};

    // 墓碑
    deco.grave = [];
    for (let v = 0; v < 3; v++) {
      const c = sprite(96, (ctx, rng) => {
        const w = 26 + v * 4, h = 40 + v * 5;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.7)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 8;
        const g = ctx.createLinearGradient(-w, -h, w, h * 0.5);
        g.addColorStop(0, '#3d4650');
        g.addColorStop(0.5, '#252d36');
        g.addColorStop(1, '#141a20');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-w / 2, h * 0.55);
        ctx.lineTo(-w / 2, -h * 0.25);
        ctx.quadraticCurveTo(-w / 2, -h * 0.62, 0, -h * 0.66);
        ctx.quadraticCurveTo(w / 2, -h * 0.62, w / 2, -h * 0.25);
        ctx.lineTo(w / 2, h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // 苔藓
        ctx.fillStyle = 'rgba(60,92,64,.28)';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(-w / 2 + rng() * w, h * 0.55 - rng() * h * 0.3, 3 + rng() * 5, 2 + rng() * 3, rng() * 3, 0, TAU);
          ctx.fill();
        }
        // 刻痕
        ctx.strokeStyle = 'rgba(120,140,150,.25)';
        ctx.lineWidth = 1.6;
        if (v === 0) {
          ctx.beginPath(); ctx.moveTo(0, -h * 0.36); ctx.lineTo(0, -h * 0.02); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-8, -h * 0.25); ctx.lineTo(8, -h * 0.25); ctx.stroke();
        } else if (v === 1) {
          ctx.beginPath(); ctx.arc(0, -h * 0.22, 8, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -h * 0.14); ctx.lineTo(0, h * 0.2); ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-8, -h * 0.3); ctx.quadraticCurveTo(0, -h * 0.15, 8, -h * 0.3);
          ctx.moveTo(-7, -h * 0.05); ctx.lineTo(7, -h * 0.05);
          ctx.stroke();
        }
        // 顶部月光
        ctx.strokeStyle = 'rgba(168,220,255,.16)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 2, -h * 0.2);
        ctx.quadraticCurveTo(-w / 2 + 2, -h * 0.6, 0, -h * 0.64);
        ctx.stroke();
      }, 2);
      deco.grave.push(c);
    }

    // 枯树
    deco.tree = [];
    for (let v = 0; v < 2; v++) {
      const c = sprite(200, (ctx, rng) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.8)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        ctx.strokeStyle = '#171a1c';
        ctx.lineCap = 'round';
        function branch(x, y, ang, len, wid, depth) {
          if (depth <= 0 || len < 5) return;
          const x2 = x + Math.cos(ang) * len;
          const y2 = y + Math.sin(ang) * len;
          ctx.lineWidth = wid;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo((x + x2) / 2 + (rng() - 0.5) * 10, (y + y2) / 2 + (rng() - 0.5) * 10, x2, y2);
          ctx.stroke();
          const n = 2 + (rng() * 2 | 0);
          for (let i = 0; i < n; i++) {
            branch(x2, y2, ang + (rng() - 0.5) * 1.5, len * (0.6 + rng() * 0.18), wid * 0.66, depth - 1);
          }
        }
        branch(0, 66, -Math.PI / 2, 46 + v * 8, 9, 5);
        ctx.restore();
      }, 2);
      deco.tree.push(c);
    }

    // 蜡烛（带光晕）
    deco.candle = [sprite(64, (ctx) => {
      const g = ctx.createRadialGradient(0, -8, 0, 0, -8, 30);
      g.addColorStop(0, 'rgba(255,190,110,.55)');
      g.addColorStop(0.35, 'rgba(255,150,70,.18)');
      g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-32, -40, 64, 64);
      ctx.fillStyle = '#d8cdb6';
      ctx.fillRect(-2.6, -4, 5.2, 15);
      ctx.fillStyle = '#b9ad94';
      ctx.fillRect(-2.6, 8, 5.2, 3);
      // 火焰
      ctx.save();
      ctx.shadowColor = '#ffb765';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffe2a8';
      ctx.beginPath();
      ctx.ellipse(0, -8, 2.4, 5.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,240,.95)';
      ctx.beginPath();
      ctx.ellipse(0, -7, 1.1, 2.8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }, 2)];

    // 石块
    deco.rock = [sprite(80, (ctx, rng) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.7)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      const g = ctx.createLinearGradient(-16, -16, 14, 16);
      g.addColorStop(0, '#3b444b');
      g.addColorStop(1, '#171d22');
      ctx.fillStyle = g;
      blobPath(ctx, 18, 8, 0.22, rng, 0.72);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(168,220,255,.1)';
      ctx.beginPath();
      ctx.ellipse(-6, -6, 7, 4, -0.4, 0, TAU);
      ctx.fill();
    }, 2)];

    // 发光蘑菇
    deco.mushroom = [sprite(56, (ctx) => {
      const g = ctx.createRadialGradient(0, 2, 0, 0, 2, 24);
      g.addColorStop(0, 'rgba(90,240,200,.35)');
      g.addColorStop(1, 'rgba(60,200,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-28, -26, 56, 56);
      ctx.strokeStyle = '#9fd8c8';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 5, 6); ctx.lineTo(i * 5, 0); ctx.stroke();
        ctx.fillStyle = i === 0 ? '#7cf0c8' : '#4fb99c';
        ctx.beginPath(); ctx.ellipse(i * 5, -2, 4.5, 3, 0, Math.PI, TAU); ctx.fill();
      }
    }, 2)];

    // 断裂石柱
    deco.pillar = [sprite(120, (ctx, rng) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.75)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 8;
      const g = ctx.createLinearGradient(-12, 0, 12, 0);
      g.addColorStop(0, '#20272e');
      g.addColorStop(0.45, '#39434c');
      g.addColorStop(1, '#141a1f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-11, 40);
      ctx.lineTo(-11, -28);
      ctx.lineTo(-6, -36);
      ctx.lineTo(3, -32);
      ctx.lineTo(9, -38);
      ctx.lineTo(11, 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-6 + i * 4, -26 + rng() * 20);
        ctx.lineTo(-5 + i * 4, 10 + rng() * 26);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(168,220,255,.1)';
      ctx.fillRect(-11, -28, 3, 68);
    }, 2)];

    return deco;
  }

  /* =========================================================
     其他精灵
     ========================================================= */
  function buildMisc() {
    // 经验宝石
    const gem = sprite(40, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(90,240,200,.8)';
      ctx.shadowBlur = 18;
      const g = ctx.createLinearGradient(-8, -10, 8, 10);
      g.addColorStop(0, '#eafff8');
      g.addColorStop(0.35, '#7cf0c8');
      g.addColorStop(1, '#1f8f78');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, -2);
      ctx.lineTo(0, 12);
      ctx.lineTo(-8, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(0, 10);
      ctx.moveTo(-7, -2); ctx.lineTo(7, -2);
      ctx.stroke();
    }, 2);

    // 大宝石（精英掉落）
    const gemBig = sprite(56, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(255,210,110,.9)';
      ctx.shadowBlur = 24;
      const g = ctx.createLinearGradient(-10, -14, 10, 14);
      g.addColorStop(0, '#fffdf0');
      g.addColorStop(0.4, '#ffd97a');
      g.addColorStop(1, '#a8681c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(11, -3);
      ctx.lineTo(0, 16);
      ctx.lineTo(-11, -3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(0, 14);
      ctx.moveTo(-10, -3); ctx.lineTo(10, -3);
      ctx.stroke();
    }, 2);

    // 心
    const heart = sprite(48, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(255,70,110,.9)';
      ctx.shadowBlur = 18;
      const g = ctx.createLinearGradient(0, -10, 0, 12);
      g.addColorStop(0, '#ffb3c4');
      g.addColorStop(1, '#c1123c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 11);
      ctx.bezierCurveTo(-16, -1, -12, -13, -5, -13);
      ctx.bezierCurveTo(-2, -13, 0, -10, 0, -8);
      ctx.bezierCurveTo(0, -10, 2, -13, 5, -13);
      ctx.bezierCurveTo(12, -13, 16, -1, 0, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }, 2);

    // 磁石：吸取全部经验
    const magnet = sprite(48, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(120,240,200,.85)';
      ctx.shadowBlur = 16;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7cf0c8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 2, 10, Math.PI, 0);
      ctx.lineTo(10, 13);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(-10, 13);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#eafff8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, 13); ctx.lineTo(-10, 8);
      ctx.moveTo(10, 13); ctx.lineTo(10, 8);
      ctx.stroke();
      ctx.restore();
    }, 2);

    // 夜火：清场爆破
    const bomb = sprite(48, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(255,150,80,.9)';
      ctx.shadowBlur = 18;
      const g = ctx.createRadialGradient(-4, -5, 1, 0, 1, 13);
      g.addColorStop(0, '#8a6a5a');
      g.addColorStop(0.45, '#3a2630');
      g.addColorStop(1, '#160e16');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 2, 11, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffb066';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(5, -7);
      ctx.quadraticCurveTo(11, -13, 8, -17);
      ctx.stroke();
      ctx.fillStyle = '#ffd97a';
      ctx.beginPath();
      ctx.arc(8, -18, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,170,.55)';
      ctx.beginPath();
      ctx.arc(-4, -3, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }, 2);

    // 时之沙：冻结
    const hourglass = sprite(48, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(140,210,255,.85)';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#bfe8ff';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -13); ctx.lineTo(8, -13);
      ctx.lineTo(2, -1); ctx.lineTo(8, 12);
      ctx.lineTo(-8, 12); ctx.lineTo(-2, -1);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#8ce8ff';
      ctx.beginPath();
      ctx.moveTo(-6, -11); ctx.lineTo(6, -11); ctx.lineTo(0, -3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }, 2);

    // 守夜护盾
    const shieldPickup = sprite(48, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(140,232,255,.9)';
      ctx.shadowBlur = 18;
      const g = ctx.createLinearGradient(0, -14, 0, 14);
      g.addColorStop(0, '#e8fbff');
      g.addColorStop(0.5, '#8ce8ff');
      g.addColorStop(1, '#2a7f9e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(11, -9);
      ctx.lineTo(11, 1);
      ctx.quadraticCurveTo(11, 10, 0, 14);
      ctx.quadraticCurveTo(-11, 10, -11, 1);
      ctx.lineTo(-11, -9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(10,40,55,.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(0, 7);
      ctx.moveTo(-4.5, -2); ctx.lineTo(4.5, -2);
      ctx.stroke();
      ctx.restore();
    }, 2);

    // 阴影
    const shadow = makeCanvas(64, 64);
    {
      const ctx = shadow.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(0,0,0,.55)');
      g.addColorStop(0.65, 'rgba(0,0,0,.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }

    // 传送门
    const portal = sprite(120, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 56);
      g.addColorStop(0, 'rgba(90,30,120,.05)');
      g.addColorStop(0.55, 'rgba(120,40,160,.18)');
      g.addColorStop(0.82, 'rgba(190,80,255,.32)');
      g.addColorStop(1, 'rgba(120,30,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-60, -60, 120, 120);
      ctx.strokeStyle = 'rgba(220,150,255,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,80,230,.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0.6, 4.2);
      ctx.stroke();
    }, 2);

    return { gem, gemBig, heart, shadow, portal, magnet, bomb, hourglass, shieldPickup };
  }

  /* =========================================================
     初始化
     ========================================================= */
  let enemies = null, ground = null, fog = null, decals = null, deco = null, misc = null, auras = null;

  function init() {
    if (enemies) return;
    enemies = buildEnemySprites();
    auras = buildAuras();
    ground = buildGround();
    fog = buildFog();
    decals = buildDecals();
    deco = buildDecorations();
    misc = buildMisc();
  }

  return {
    init,
    get enemies() { return enemies; },
    get auras() { return auras; },
    get ground() { return ground; },
    get fog() { return fog; },
    get decals() { return decals; },
    get deco() { return deco; },
    get misc() { return misc; },
    makeCanvas,
    mulberry32,
    TAU
  };
})();
