/* =========================================================
   长夜将尽 · Nightwatch
   定向瞄准、灯塔目标与精准闪避（纯离线逻辑）
   ========================================================= */
window.Nightwatch = (function () {
  'use strict';

  function pointerWorld(x, y, rect, camera, zoom) {
    return {
      x: camera.x + (x - rect.left - rect.width / 2) / zoom,
      y: camera.y + (y - rect.top - rect.height / 2) / zoom
    };
  }

  function createBeacons(seed) {
    const angle = (seed >>> 0) % 360 * Math.PI / 180;
    return [350, 650, 900].map((distance, i) => {
      const a = angle + i * Math.PI * 2 / 3;
      return { x: Math.cos(a) * distance, y: Math.sin(a) * distance,
        radius: 90, charge: 0, done: false, name: '守夜灯塔 ' + (i + 1) };
    });
  }

  function chargeBeacon(b, player, dt) {
    if (b.done || player.dead) return false;
    if (Math.hypot(player.x - b.x, player.y - b.y) > b.radius) return false;
    b.charge = Math.min(1, b.charge + Math.max(0, Math.min(dt, 0.1)) / 8);
    if (b.charge < 1) return false;
    b.done = true;
    return true;
  }

  function nearMiss(p, bullet) {
    if (p.dead || p.dashT <= 0 || p.dodgeRewarded || bullet.dead) return false;
    const sx = (p.frameX === undefined ? p.x : p.frameX) - (bullet.px === undefined ? bullet.x : bullet.px);
    const sy = (p.frameY === undefined ? p.y : p.frameY) - (bullet.py === undefined ? bullet.y : bullet.py);
    const dx = p.x - bullet.x - sx, dy = p.y - bullet.y - sy;
    const length2 = dx * dx + dy * dy;
    const t = length2 > 0 ? Math.max(0, Math.min(1, -(sx * dx + sy * dy) / length2)) : 0;
    const distance = Math.hypot(sx + dx * t, sy + dy * t);
    if (distance <= p.r + bullet.r || distance > p.r + bullet.r + 30) return false;
    p.dodgeRewarded = true;
    return true;
  }

  function loadout(p, level, defs, evo) {
    const items = Object.keys(p.upgrades).filter(id => p.upgrades[id] > 0 && defs[id])
      .map(id => ({ id, name: defs[id].name, level: p.upgrades[id], max: defs[id].max }))
      .sort((a, b) => b.level - a.level);
    const evolution = evo ? { name: evo.name, requiredLevel: evo.level, currentLevel: level,
      requiredUpgrade: evo.need.lv, currentUpgrade: p.upgrades[evo.need.id] || 0,
      ready: !p.evolved && level >= evo.level && (p.upgrades[evo.need.id] || 0) >= evo.need.lv,
      done: !!p.evolved } : null;
    return { items, evolution };
  }

  return { pointerWorld, createBeacons, chargeBeacon, nearMiss, loadout };
})();
