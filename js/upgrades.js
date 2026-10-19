/* =========================================================
   长夜将尽 · Upgrades
   ========================================================= */
window.Upgrades = (function () {
  'use strict';

  const RARITY = {
    common:    { name: 'COMMON',    cn: '普通', color: '#9ec6e8', glow: 'rgba(158,198,232,.18)', weight: 30 },
    uncommon:  { name: 'UNCOMMON',  cn: '精良', color: '#5ce8b8', glow: 'rgba(92,232,184,.20)',  weight: 26 },
    rare:      { name: 'RARE',      cn: '稀有', color: '#b48cff', glow: 'rgba(180,140,255,.24)', weight: 18 },
    epic:      { name: 'EPIC',      cn: '史诗', color: '#ff9d5c', glow: 'rgba(255,157,92,.26)',  weight: 10 },
    legendary: { name: 'LEGENDARY', cn: '传说', color: '#f3cf7a', glow: 'rgba(243,207,122,.30)', weight: 4 }
  };

  function icon(inner) {
    return '<svg viewBox="0 0 48 48" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }

  const LIST = [
    {
      id: 'power', name: '灼热弹头', rarity: 'common', max: 5,
      icon: icon('<path d="M24 7 34 25H14Z"/><path d="M24 25v14"/><path d="M8 15l5 3M40 15l-5 3"/><path d="M17 33h14" opacity=".5"/>'),
      desc: () => '子弹伤害 <b>+22%</b>',
      apply: p => { p.damageMult *= 1.22; }
    },
    {
      id: 'rapid', name: '快速装填', rarity: 'common', max: 5,
      icon: icon('<path d="M28 5 13 27h8l-3 16 16-24h-9l3-14Z"/>'),
      desc: () => '射击间隔 <b>-14%</b>',
      apply: p => { p.fireRateMult *= 1.16; }
    },
    {
      id: 'pierce', name: '穿甲弹', rarity: 'uncommon', max: 4,
      icon: icon('<path d="M5 24h29"/><path d="m29 17 9 7-9 7"/><path d="M14 9v30M22 9v30" opacity=".55"/>'),
      desc: () => '子弹额外穿透 <b>1</b> 个敌人',
      apply: p => { p.pierce += 1; }
    },
    {
      id: 'spread', name: '散射', rarity: 'rare', max: 4,
      icon: icon('<path d="M7 24h11"/><path d="m18 24 22-15M18 24h23M18 24l22 15"/><path d="m35 6 5 3-1 5M36 20h5M35 42l5-3-1-5"/>'),
      desc: () => '每次射击 <b>+1</b> 发子弹',
      apply: p => { p.projectiles += 1; p.spread += 0.075; }
    },
    {
      id: 'crit', name: '致命弱点', rarity: 'uncommon', max: 5,
      icon: icon('<circle cx="24" cy="24" r="10"/><path d="M24 3v9M24 36v9M3 24h9M36 24h9"/><circle cx="24" cy="24" r="2.4"/>'),
      desc: () => '暴击率 <b>+8%</b>',
      apply: p => { p.critChance += 0.08; }
    },
    {
      id: 'critdmg', name: '猎杀本能', rarity: 'rare', max: 4,
      icon: icon('<path d="m24 4 4.5 11.5L40 20l-11.5 4.5L24 36l-4.5-11.5L8 20l11.5-4.5Z"/><path d="m36 34 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" opacity=".6"/>'),
      desc: () => '暴击伤害 <b>+35%</b>',
      apply: p => { p.critMult += 0.35; }
    },
    {
      id: 'boots', name: '轻装', rarity: 'common', max: 4,
      icon: icon('<path d="M15 7v18c0 5 4 9 9 9h11c3 0 4-3 2-5l-9-9-1-13Z"/><path d="M15 29h15M8 13l5 2M6 21l6 1"/>'),
      desc: () => '移动速度 <b>+9%</b>',
      apply: p => { p.speedMult *= 1.09; }
    },
    {
      id: 'vitality', name: '坚韧', rarity: 'common', max: 5,
      icon: icon('<path d="M24 41S7 30 7 18.5A8.5 8.5 0 0 1 24 14a8.5 8.5 0 0 1 17 4.5C41 30 24 41 24 41Z"/><path d="M24 17v13M17.5 23.5h13"/>'),
      desc: () => '生命上限 <b>+25</b>，并回复 25',
      apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); }
    },
    {
      id: 'magnet', name: '磁力', rarity: 'common', max: 3,
      icon: icon('<path d="M13 8v16a11 11 0 0 0 22 0V8"/><path d="M13 8h8v16a3 3 0 0 0 6 0V8h8"/><path d="M13 17h8M27 17h8"/>'),
      desc: () => '拾取范围 <b>+50%</b>',
      apply: p => { p.pickupMult *= 1.5; }
    },
    {
      id: 'lore', name: '求知', rarity: 'uncommon', max: 4,
      icon: icon('<path d="M24 14c-4-4-10-5-17-4v25c7-1 13 0 17 4 4-4 10-5 17-4V10c-7-1-13 0-17 4Z"/><path d="M24 14v25"/><path d="M12 18h6M12 24h6M30 18h6M30 24h6" opacity=".55"/>'),
      desc: () => '获得经验 <b>+20%</b>',
      apply: p => { p.xpMult *= 1.2; }
    },
    {
      id: 'leech', name: '血之契约', rarity: 'rare', max: 3,
      icon: icon('<path d="M24 5S12 18 12 27a12 12 0 0 0 24 0C36 18 24 5 24 5Z"/><path d="M18 28c2.5 3.5 9.5 3.5 12 0"/><path d="M24 17v7" opacity=".55"/>'),
      desc: () => '造成伤害的 <b>1.8%</b> 转化为生命',
      apply: p => { p.lifesteal += 0.018; }
    },
    {
      id: 'regen', name: '再生', rarity: 'uncommon', max: 4,
      icon: icon('<path d="M39 7C22 7 10 17 10 30c0 5 4 10 10 10 13 0 19-15 19-33Z"/><path d="M14 37C20 27 28 20 37 15"/>'),
      desc: () => '每秒回复 <b>0.7</b> 生命',
      apply: p => { p.regen += 0.7; }
    },
    {
      id: 'burn', name: '燃烧弹', rarity: 'rare', max: 4,
      icon: icon('<path d="M25 4c2 9-9 12-9 22a10 10 0 0 0 20 0c0-5-2-8-6-11 0 4-2 7-4 8 2-8-1-13-1-19Z"/><path d="M24 26c-2 2-3 4-3 6a3.5 3.5 0 0 0 7 0c0-2-2-4-4-6Z" opacity=".6"/>'),
      desc: lv => '命中附加燃烧，每秒 <b>' + (3.5 * lv).toFixed(1) + '</b> 伤害，持续 3 秒',
      apply: p => { p.burnLevel += 1; }
    },
    {
      id: 'freeze', name: '霜冻弹', rarity: 'uncommon', max: 3,
      icon: icon('<path d="M24 4v40M6 14l36 20M42 14 6 34"/><path d="m18 8 6 5 6-5M18 40l6-5 6 5M9 19l7-1 1-7M39 29l-7 1-1 7M39 19l-7-1-1-7M9 29l7 1 1 7" opacity=".7"/>'),
      desc: lv => '命中使敌人减速 <b>' + (22 * lv) + '%</b>，持续 1.6 秒',
      apply: p => { p.freezeLevel += 1; }
    },
    {
      id: 'chain', name: '连锁闪电', rarity: 'epic', max: 3,
      icon: icon('<circle cx="9" cy="11" r="3"/><circle cx="39" cy="19" r="3"/><circle cx="17" cy="39" r="3"/><path d="M12 12 22 19l5-5 9 5M22 19l-3 17"/><path d="m25 22-4 6h5l-3 6" opacity=".75"/>'),
      desc: lv => '命中时闪电跳跃至 <b>' + (lv + 1) + '</b> 个额外目标',
      apply: p => { p.chainLevel += 1; }
    },
    {
      id: 'explode', name: '爆裂弹', rarity: 'epic', max: 3,
      icon: icon('<circle cx="24" cy="24" r="6"/><path d="M24 3v9M24 36v9M3 24h9M36 24h9M9 9l6 6M33 33l6 6M39 9l-6 6M15 33l-6 6"/><circle cx="24" cy="24" r="14" opacity=".35"/>'),
      desc: lv => '击杀敌人时爆炸，造成 <b>' + (10 + lv * 9) + '</b> 点范围伤害',
      apply: p => { p.explodeLevel += 1; }
    },
    {
      id: 'orb', name: '环绕光球', rarity: 'epic', max: 4,
      icon: icon('<ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(-28 24 24)"/><circle cx="24" cy="24" r="4.5"/><circle cx="8" cy="14" r="3"/><circle cx="40" cy="33" r="3"/>'),
      desc: lv => '获得 <b>1</b> 颗环绕光球，伤害 <b>' + (12 + lv * 9) + '</b>',
      apply: p => { p.orbLevel += 1; }
    },
    {
      id: 'aura', name: '荆棘光环', rarity: 'rare', max: 3,
      icon: icon('<circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="13" opacity=".65"/><path d="M24 3v6M24 39v6M3 24h6M39 24h6M9 9l4 4M35 35l4 4M39 9l-4 4M13 35l-4 4"/>'),
      desc: lv => '身周荆棘每秒灼烧敌人 <b>' + (7 * lv) + '</b> 点',
      apply: p => { p.auraLevel += 1; }
    },
    {
      id: 'dashcd', name: '疾影', rarity: 'uncommon', max: 3,
      icon: icon('<path d="M15 6h18M15 42h18M17 6c0 9 8 11 8 18s-8 9-8 18M31 6c0 9-8 11-8 18s8 9 8 18"/><path d="M20 24h8" opacity=".6"/>'),
      desc: () => '冲刺冷却 <b>-22%</b>',
      apply: p => { p.dashCdMult *= 0.78; }
    },
    {
      id: 'dashdmg', name: '幻影冲击', rarity: 'rare', max: 2,
      icon: icon('<circle cx="33" cy="14" r="6"/><path d="M27 20 6 41M19 16l-9-2M15 27l-9 3M25 6l2-4"/><path d="M28 14h2" opacity=".6"/>'),
      desc: lv => '冲刺留下爆裂残影，伤害 <b>' + (35 + lv * 25) + '</b>',
      apply: p => { p.dashLevel += 1; }
    },
    {
      id: 'luck', name: '命运垂青', rarity: 'rare', max: 3,
      icon: icon('<rect x="9" y="9" width="30" height="30" rx="5"/><circle cx="18" cy="18" r="2"/><circle cx="30" cy="30" r="2"/><circle cx="24" cy="24" r="2"/><path d="M30 12v2M34 16h-2" opacity=".55"/>'),
      desc: () => '高稀有度强化出现率提升',
      apply: p => { p.luck += 1; }
    },
    {
      id: 'velocity', name: '高速弹', rarity: 'common', max: 3,
      icon: icon('<path d="M6 24h27M25 13l11 11-11 11"/><path d="M6 14h11M6 34h11" opacity=".55"/>'),
      desc: () => '子弹飞行速度 <b>+22%</b>',
      apply: p => { p.bulletSpeedMult *= 1.22; }
    },
    {
      id: 'caliber', name: '大口径', rarity: 'uncommon', max: 3,
      icon: icon('<path d="M18 5h12v11c6 4 7 10 7 16v11H11V32c0-6 1-12 7-16Z"/><path d="M11 32h26M18 21h12"/><path d="M24 11v6" opacity=".55"/>'),
      desc: () => '子弹体积 <b>+20%</b>，伤害 <b>+6%</b>',
      apply: p => { p.bulletSizeMult *= 1.2; p.damageMult *= 1.06; }
    },
    {
      id: 'revive', name: '第二心脏', rarity: 'legendary', max: 1,
      icon: icon('<path d="M24 41S7 30 7 18.5A8.5 8.5 0 0 1 24 14a8.5 8.5 0 0 1 17 4.5C41 30 24 41 24 41Z"/><path d="M24 13V4M18 8 15 4M30 8l3-4"/><path d="M19 24h4l2-5 3 10 2-5h3" opacity=".7"/>'),
      desc: () => '死亡时 <b>复活一次</b>，恢复 50% 生命',
      apply: p => { p.revives += 1; }
    },
    {
      id: 'covenant', name: '黎明契约', rarity: 'legendary', max: 3,
      icon: icon('<path d="M31 6a17 17 0 1 0 9 30A14 14 0 0 1 31 6Z"/><path d="m38 10 1.8 4.7 4.7 1.8-4.7 1.8L38 23l-1.8-4.7-4.7-1.8 4.7-1.8Z"/>'),
      desc: () => '所有伤害 <b>+12%</b>',
      apply: p => { p.damageMult *= 1.12; }
    },
    {
      id: 'dawnfire', name: '破晓之焰', rarity: 'legendary', max: 2,
      icon: icon('<path d="M5 35h38M12 35a12 12 0 0 1 24 0"/><path d="M24 7v7M9 15l5 4M39 15l-5 4M3 26h6M39 26h6"/>'),
      desc: () => '伤害 <b>+12%</b>，射速 <b>+12%</b>',
      apply: p => { p.damageMult *= 1.12; p.fireRateMult *= 1.12; }
    }
  ];

  // 保底强化：仅在可选池不足时出现
  const MEND = {
    id: 'mend', name: '生命汲取', rarity: 'common', max: 99,
    icon: icon('<path d="M24 41S7 30 7 18.5A8.5 8.5 0 0 1 24 14a8.5 8.5 0 0 1 17 4.5C41 30 24 41 24 41Z"/><path d="M12 24h7l3-6 4 12 3-6h7"/>'),
    desc: () => '立即回复 <b>30</b> 生命',
    apply: p => { p.hp = Math.min(p.maxHp, p.hp + 30); }
  };

  const BY_ID = {};
  LIST.forEach(u => { BY_ID[u.id] = u; });
  BY_ID.mend = MEND;

  function weightOf(u, luck) {
    const base = RARITY[u.rarity].weight;
    if (u.rarity === 'rare') return base * (1 + luck * 0.30);
    if (u.rarity === 'epic') return base * (1 + luck * 0.45);
    if (u.rarity === 'legendary') return base * (1 + luck * 0.60);
    if (u.rarity === 'common') return base / (1 + luck * 0.12);
    return base;
  }

  function pickWeighted(pool, player) {
    let total = 0;
    const weights = pool.map(u => {
      const w = weightOf(u, player.luck);
      total += w;
      return w;
    });
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return pool.length - 1;
  }

  // 输出类强化：每次升级至少保证出现一个，避免连续拿到纯功能牌
  const OFFENSE = ['power', 'rapid', 'pierce', 'spread', 'crit', 'critdmg', 'caliber', 'burn', 'chain', 'explode', 'orb', 'aura', 'velocity', 'dawnfire'];

  function roll(player, count) {
    const pool = LIST.filter(u => (player.upgrades[u.id] || 0) < u.max);
    const out = [];
    if (count > 0) {
      const off = pool.filter(u => OFFENSE.indexOf(u.id) >= 0);
      if (off.length > 0) {
        const u = off[pickWeighted(off, player)];
        out.push(u);
        pool.splice(pool.indexOf(u), 1);
      }
    }
    while (out.length < count && pool.length > 0) {
      const i = pickWeighted(pool, player);
      out.push(pool.splice(i, 1)[0]);
    }
    while (out.length < count) out.push(MEND);
    return out;
  }

  function levelOf(player, u) {
    return player.upgrades[u.id] || 0;
  }

  function apply(player, u) {
    player.upgrades[u.id] = (player.upgrades[u.id] || 0) + 1;
    u.apply(player);
  }

  return { LIST, RARITY, BY_ID, roll, apply, levelOf };
})();
