/* Long Night · hand-painted rain hunter. Classic script; no dependencies or network.
 * Art.init must call Character.init once before drawing. Units are world pixels.
 * Origin is the torso/collision centre, not the feet. Gun local muzzle is (24, 0).
 * Only init builds paths/gradients. Animation composites articulated cached parts.
 *
 * Art direction (2026-10-27 "ink & lantern" pass): the figure is a dark cool mass held
 * together by two lights only — a cold moon rim from above and the warm lantern bounce
 * from below-left. Every plane is one of three values (shadow / body / light), so the
 * silhouette survives at real game scale instead of turning into a pale sticker.
 */
window.Character = (function () {
  'use strict';
  const SS = 3, ATLAS_W = 256, PAD = 2;
  const INK = '#0a1218';
  const RIM = '#d6f2f7', RIM_SOFT = '#8fb6c2';
  const WARM = '#f6c87e', WARM_SOFT = 'rgba(246,200,126,.30)';
  const BRASS = '#c49c5b', BRASS_HI = '#f2da9e';
  const SKIN_HI = '#fcefda', SKIN = '#efd2ae', SKIN_MID = '#cfa584', SKIN_DARK = '#96735d', SKIN_DEEP = '#6a4d3f';
  const COAT_HI = '#6d97a7', COAT = '#2b4a58', COAT_MID = '#1d3644', COAT_DARK = '#0e1c25';
  const LEATHER = '#4b3628', LEATHER_HI = '#7f5c3f';
  const STEEL_HI = '#c9dfe4', STEEL = '#2f444e', STEEL_DARK = '#16232b';
  const CAPE_HI = '#51798a', CAPE = '#213844', CAPE_DARK = '#0f1d27';
  const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, finite(v)));
  const HEAD_SCALE = 0.88;
  const views = ['side', 'quarter', 'front', 'rearquarter', 'back'];
  const directions = ['right', 'front-right', 'front', 'front-left', 'left', 'back-left', 'back', 'back-right'];
  let assets = null;

  // Small path notation is parsed only while painting the atlas, never during draw.
  function trace(c, source) {
    const t = source.match(/[MLCQZ]|-?(?:\d*\.)?\d+/g);
    let i = 0; c.beginPath();
    while (i < t.length) {
      const command = t[i++];
      const n = command === 'C' ? 6 : command === 'Q' ? 4 : command === 'Z' ? 0 : 2;
      const args = t.slice(i, i + n).map(Number); i += n;
      if (command === 'M') c.moveTo(...args);
      else if (command === 'L') c.lineTo(...args);
      else if (command === 'C') c.bezierCurveTo(...args);
      else if (command === 'Q') c.quadraticCurveTo(...args);
      else c.closePath();
    }
  }
  function paint(c, fill, source, stroke = INK, width = 0.75) {
    trace(c, source);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  function line(c, color, width, source) { paint(c, null, source, color, width); }
  function grad(c, x1, y1, x2, y2, colors) {
    const g = c.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
    return g;
  }
  function buckle(c, x, y, w = 2.6, h = 2.1) {
    c.fillStyle = '#2a2119'; c.fillRect(x, y, w, h);
    c.strokeStyle = BRASS; c.lineWidth = 0.5; c.strokeRect(x, y, w, h);
    line(c, BRASS_HI, 0.36, `M${x + w * 0.5} ${y} L${x + w * 0.5} ${y + h}`);
  }

  function hatFeather(c) {
    // A broken quill gives the hunter a readable asymmetrical profile at 1x.
    paint(c, grad(c, 0, -2, 4, -11, ['#cfe4e7', '#708f9b', '#1b2b36']),
      'M0 1 C1.4 -3 1 -7.6 3.4 -11.2 C4.6 -9.4 5.6 -6.8 5 -4.2 C4.2 -1.2 2.6 1 0 1 Z', INK, 0.55);
    line(c, '#b9d8dc', 0.35, 'M1 -0.2 C2.6 -3.6 3.4 -7 3.8 -9.4');
    line(c, '#44606c', 0.3, 'M2 -3 L4.4 -4.8 M2.6 -5 L4.6 -6.6');
  }

  function coatPin(c) {
    // A small compass pin anchors the chest and adds a warm identity mark.
    paint(c, '#332a1e', 'M0 -2 L3 1 L0 5 L-3 1 Z', INK, 0.55);
    paint(c, '#dcb96c', 'M0 -1.2 L1.8 1 L0 3.1 L-1.8 1 Z', '#6d5431', 0.35);
    line(c, '#fff2bd', 0.3, 'M0 -0.6 L0 2.6 M-1.3 1 L1.3 1');
  }

  function vial(c) {
    // Sanctified blue ether vial on hip: glass tube with cork stopper and luminous contents.
    paint(c, '#5c412b', 'M-1.4 -3.6 L1.4 -3.6 L1 -2 L-1 -2 Z', INK, 0.4);
    paint(c, '#2c2218', 'M-2 -2 L2 -2 L2.4 -0.8 L-2.4 -0.8 Z', INK, 0.45);
    line(c, BRASS, 0.5, 'M-1.8 -1.4 L1.8 -1.4');
    paint(c, 'rgba(20,40,55,.65)', 'M-2.2 -0.8 L2.2 -0.8 C2.6 2 2.6 5 1.8 6.5 C1 7.4 -1 7.4 -1.8 6.5 C-2.6 5 -2.6 2 -2.2 -0.8 Z', INK, 0.5);
    paint(c, grad(c, 0, 1, 0, 6.5, ['#7be2f8', '#2fa8d0', '#155b76']),
      'M-1.8 1.5 C-0.5 1 0.5 1 1.8 1.5 C2.2 3.5 2.2 5 1.5 6 C0.8 6.6 -0.8 6.6 -1.5 6 C-2.2 5 -2.2 3.5 -1.8 1.5 Z', null);
    line(c, '#e0f9ff', 0.4, 'M-1.5 1.6 C0 1.2 1.5 1.6 1.5 1.6');
    line(c, 'rgba(255,255,255,.65)', 0.4, 'M-1.8 0.2 C-2.2 2 -2.1 4.5 -1.4 5.8');
  }

  function gearPouch(c) {
    // Heavy oiled leather cartridge box with brass snap clasp on the hunter's belt.
    paint(c, grad(c, -3.5, -2, 3.5, 4.5, ['#4f3929', '#2f2117', '#140d09']),
      'M-3.2 -2 L3.2 -2 C3.8 -2 4.2 -1.4 4.2 -0.6 L4 4 C4 4.8 3.4 5.2 2.6 5.2 L-2.6 5.2 C-3.4 5.2 -4 4.8 -4 4 L-4.2 -0.6 C-4.2 -1.4 -3.8 -2 -3.2 -2 Z', INK, 0.6);
    paint(c, grad(c, -3.5, -2, 3.5, 2, ['#5d4432', '#3a2b1f']),
      'M-3.6 -2 L3.6 -2 L3.4 1.5 C2 2.4 -2 2.4 -3.4 1.5 Z', INK, 0.5);
    line(c, '#99734e', 0.35, 'M-3.2 -1.6 L3.2 -1.6 M-3 1.2 C-1.5 2 1.5 2 3 1.2');
    c.fillStyle = BRASS; c.fillRect(-0.7, 1, 1.4, 1.2);
    c.fillStyle = BRASS_HI; c.fillRect(-0.4, 1.2, 0.8, 0.6);
  }

  function kneeGuard(c) {
    // A separate curved knee plate makes the stride read as a joint, not a tube.
    paint(c, grad(c, -3, 0, 3, 4, ['#9db6bf', '#4f6a77', '#1f333f']),
      'M-3 0 C-1 -1 2 -1 3 0 L2.5 4 C1 5 -1 5 -2.5 4 Z', INK, 0.55);
    line(c, RIM, 0.4, 'M-1.8 0.5 C0 1.3 1.5 1.3 2.2 0.5');
    line(c, '#16262f', 0.45, 'M-1.8 3.4 C0 4 1.3 4 2 3.3');
  }

  function heel(c) {
    // The raised heel and tread interrupt the boot's long vertical silhouette.
    paint(c, '#1d272e', 'M-3 0 L2 0 L3 3 L5 4 L4.5 6 L-3 6 Z', INK, 0.5);
    line(c, '#b6c8cc', 0.4, 'M-2.4 1 L1.7 1.1 M-2.5 4.8 L4 5');
    line(c, '#6d5236', 0.3, 'M1.6 2 L2.4 3 M0 2 L0.8 3');
  }

  function torso(c, view) {
    const front = view !== 'back' && view !== 'rearquarter';
    const narrow = view === 'side';
    c.save(); if (narrow) c.scale(0.82, 1);
    // Dark wool coat. The body is deliberately one dark value: the hunter reads as a
    // silhouette that two lights pick out, instead of a pale sticker that floats.
    paint(c, grad(c, -9, -10, 4, 8, ['#2b4656', '#20394a', '#142633']),
      'M-3 -10 C-6 -10 -8.4 -8.2 -9.2 -5 L-7.2 0 C-6.6 3 -6.3 5 -7 8 C-3 9.6 3 9.6 7 8 C6.3 5 6.6 3 7.2 0 L9.2 -5 C8.4 -8.2 6 -10 3 -10 Z', INK, 0.9);
    // Warm bounce off the lantern, low and to the left. This is the only warm paint on the coat.
    paint(c, grad(c, -8, 2, -1, 9, ['rgba(240,178,104,.26)', 'rgba(240,178,104,0)']),
      'M-7.2 0 C-6.6 3 -6.3 5 -7 8 C-5 8.6 -3.4 8.4 -2.6 7.6 L-3.4 2 C-5 0.6 -6.4 -0.2 -7.2 0 Z', null);
    // Far side, turned away from both lights: pure shadow with a single cool bounce.
    paint(c, '#162835', 'M3 -9.8 C5.8 -9.6 8.2 -7.8 9 -5 L7.2 0 L6.3 8 L0.6 9 L1.4 -3 Z', null);
    paint(c, '#33566a', 'M4.6 -7 C6.4 -5.8 7.2 -3.4 7 -1 L6 1 L5.4 6 L3.4 6.6 L4.2 -2 Z', null);
    // Fabric folds: five deliberate strokes, no field of hairlines.
    line(c, '#7ea3b1', 0.55, 'M-8 -5.6 C-7.4 -7.4 -6.2 -8.6 -4.4 -9.2');
    line(c, '#0c1a23', 0.75, 'M-5.6 -1 C-4.8 2 -5 4 -4.6 6 M2.6 -3 C3.4 -1 3.1 2 3.6 5');
    // Moonlight edge along the top of the shoulders — the rain is backlit here.
    line(c, RIM, 0.8, 'M-9 -4.6 C-8.2 -8 -5.8 -10 -3.2 -10 M3.2 -10 C5.8 -9.6 8 -7.4 9 -4.2');
    if (front) {
      // Collar rises around the neck but never masks the cheeks.
      paint(c, '#0e1f28', 'M-4.6 -10.6 L-6.6 -7.8 L-2.8 -2 L0 -6 L2.8 -2 L6.6 -7.8 L4.6 -10.6 Z');
      paint(c, '#4a6a79', 'M-4.6 -9.8 L-4.6 -7 L-1.8 -4 L-0.8 -6 Z', null);
      paint(c, '#264554', 'M3.8 -9.8 L4.6 -7 L1.8 -4 L0.8 -6 Z', null);
      line(c, '#a9c6d2', 0.45, 'M-4.6 -10.4 L-2.8 -8.2 M4.6 -10.4 L2.8 -8.4');
      // Open coat front: two dark lapel planes either side of a lit shirt strip.
      paint(c, '#10222c', 'M-1.8 -5 L1 -6 L2.8 7 L-1 8 Z', null);
      paint(c, '#2c4856', 'M-1.1 -5.2 L0.4 -5.6 L1.1 7 L-0.4 7.4 Z', null);
      for (let y = -2; y < 7; y += 2.5) {
        c.fillStyle = BRASS; c.fillRect(0.2, y, 0.9, 0.7);
        c.fillStyle = BRASS_HI; c.fillRect(0.25, y, 0.4, 0.22);
      }
      // Diagonal leather baldric, piping and a real brass clasp.
      paint(c, '#3d2a1e', 'M-6.8 -8 L-5 -9 L7 7 L4 8 Z', '#141a1e', 0.65);
      line(c, '#a07c50', 0.6, 'M-5.8 -8 L6.2 8'); buckle(c, -1.3, -0.6, 2.6, 2.6);
      paint(c, '#2d211a', 'M-7.4 5 C-3 6 3 6 7.4 5 L7.4 7 C3 8 -3 8 -7.4 7 Z', INK, 0.6);
      buckle(c, 1.3, 5.5);
      line(c, '#8a9ea8', 0.45, 'M-5.6 1.7 L-3 1.7 M4.6 1.7 L6.4 1');
      // Compact cartridge pouch, not a sci-fi rectangular breastplate.
      paint(c, '#42301f', 'M-7.4 4 C-5.6 3 -3.8 4 -3.8 5 L-3.8 8 C-4.8 9 -6.6 9 -7.4 8 Z');
      line(c, '#a3815a', 0.45, 'M-6.6 4.5 L-4.8 4.5 M-6 6 L-6 7.6');
    } else {
      // Rear yoke, centre seam, belt and weathered shoulder stitching.
      paint(c, '#2c4757', 'M-8.6 -6 C-4.4 -8.6 4.4 -8.6 8.6 -6 L7 -2.4 C2 -4.2 -2.6 -4.2 -7.8 -2.4 Z', null);
      line(c, '#8aa4af', 0.55, 'M-7.8 -5 C-3.6 -6.8 3.6 -6.8 7.8 -5');
      line(c, '#0a1720', 0.7, 'M0 -4 C-1 0 1 4 0 8');
      paint(c, '#2d211a', 'M-7.4 5 C-3.6 6 3.6 6 7.4 5 L7.4 7 C2 8 -2 8 -7.4 7 Z');
      buckle(c, -3, 5.5, 2.3, 1.8);
      paint(c, '#332822', 'M-4.6 -8.6 L-2.8 -9.6 L6.6 5.8 L4.6 6.8 Z', INK, 0.5);
      line(c, '#7f6344', 0.45, 'M-3.4 -7.6 L5.4 6');
      // Back folds hint at the shoulder blades under wet cloth.
      line(c, '#132530', 0.6, 'M-4.6 -3 C-3.6 0 -4 3 -3.6 6 M4.6 -3 C3.6 0 4 3 3.6 6');
    }
    c.restore();
  }

  function head(c, view) {
    const profile = view === 'side', quarter = view === 'quarter';
    const rear = view === 'back' || view === 'rearquarter';
    // Neck: two planes plus the shadow a jaw casts, so the head sits on the body.
    paint(c, grad(c, -2, -15, 3, -10, ['#b9a28c', '#947d6d', '#5f4d43']),
      'M-2 -14 L-2 -10 C0 -9 3 -10 4 -11 L3 -15 Z', INK, 0.6);
    line(c, '#4b3c34', 0.5, profile ? 'M-1.6 -12.6 C0 -12 2 -12.2 3.4 -12.8' : 'M-1.4 -12.8 C0 -12.1 2 -12.2 3.6 -13');
    // Hair mass tucked behind the ear; strands break the silhouette.
    paint(c, grad(c, -6, -23, 6, -13, ['#2d3742', '#1f272f', '#10161d']),
      'M-6 -22 C-9 -21 -8 -16 -6 -13.5 L-3 -12.5 L0 -16.5 L5 -15.5 L7 -21 Z');
    line(c, '#4a5560', 0.45, 'M-6.6 -20 C-7.4 -18 -7 -15.6 -6.2 -14 M-5 -21 L-5.6 -17');
    if (!rear) {
      // Ear: helix, antihelix and the dark concha that makes it read as a volume.
      paint(c, '#d7c2a7', 'M-5 -20 C-6 -22 -8 -20 -7 -18 C-7 -16 -5 -16 -4 -17.2 Z', INK, 0.55);
      paint(c, '#967a6a', 'M-6.4 -19.6 C-6.9 -19 -6.6 -17.4 -5.6 -17.2 C-5.2 -17.8 -5.4 -19 -6.4 -19.6 Z', null);
      line(c, '#6f5a4f', 0.32, 'M-6 -19.2 C-6.4 -18.4 -6.2 -17.8 -5.7 -17.7');
      if (!profile) {
        paint(c, '#cdb69b', 'M5 -20 C7 -22 8 -19 7 -17 L5 -16 Z', INK, 0.5);
        paint(c, '#8f7668', 'M5.6 -19.4 C6.3 -19.6 6.8 -18.6 6.3 -17.9 C5.9 -18.3 5.6 -18.9 5.6 -19.4 Z', null);
        line(c, '#7c6558', 0.32, 'M6 -19 L6.4 -18');
      }
      const face = profile ? 'M-3 -23 C1 -24 5 -23 6 -21 L6 -19 L8 -17.5 L6 -17 L6 -14.5 C4 -12 1 -11 -2 -13 C-4 -15 -4 -19 -3 -23 Z'
        : quarter ? 'M-4 -23 C-1 -24 4 -23 5 -21 L5.5 -19 L7 -17.5 L5 -17 L5 -14.5 C3 -11.5 -1 -11.5 -3 -13.5 C-5 -15.5 -5 -20 -4 -23 Z'
          : 'M-5 -23 C-3 -24 3 -24 5 -22 L5 -17.5 C5 -14.5 3 -12 0 -12 C-3 -12.5 -5 -14.5 -5 -17.5 Z';
      // Base skin: warm, but grading darker toward the jaw and the far cheek.
      paint(c, grad(c, -4, -22, 5, -13, [SKIN_HI, SKIN, SKIN_MID, SKIN_DARK]), face, INK, 0.7);
      // Brim shadow: the hat throws a band across the brow. This single value break is
      // what makes the head read as a head at game scale.
      paint(c, 'rgba(38,30,28,.30)', profile
        ? 'M-3 -23 C1 -24 5 -23 6 -21 L6.2 -20.4 C4 -20.9 1 -21.1 -3 -20.9 Z'
        : 'M-4.6 -23 C-2 -24 3 -24 5 -22 L5.1 -21.3 C2 -21.9 -1.6 -21.9 -4.4 -21.2 Z', null);
      // Forehead lit plane below the shadow.
      paint(c, '#fcefda', profile ? 'M0 -20.6 C2 -20.8 4 -20.6 4.8 -20 L4.6 -19.2 C2 -19.7 0 -19.7 -0.4 -19.4 Z'
        : 'M-3.4 -20.9 C-1 -21.4 2 -21.2 4.2 -20.2 L4 -19.4 C1.6 -20 -1 -20 -3.2 -19.6 Z', null);
      paint(c, '#ab8f7a', profile ? 'M5.4 -21.4 C6 -20.6 6.1 -19.8 5.9 -19 L4.8 -19.6 Z' : 'M4.4 -21.8 C5.2 -21.4 5.4 -20.4 5.2 -19.4 L4 -20 Z', null);
      paint(c, '#fff4e2', profile ? 'M1.6 -19.6 C2.6 -19.7 3.6 -19.3 4.2 -18.6 C3.2 -18.4 2.2 -18.8 1.6 -19.6 Z' : 'M-1.4 -19.4 C-0.2 -19.9 1.6 -19.9 2.8 -19.2 C1.8 -18.6 0.4 -18.6 -1 -18.9 Z', null);
      // Cheek: one broad soft plane, not patches — a light pass plus its shadow edge.
      paint(c, '#f9e7c8', profile ? 'M2.4 -18.4 C3.4 -18.2 4.3 -17.4 4.4 -16.4 C3.4 -16.2 2.6 -16.8 2.2 -17.6 Z' : 'M-0.6 -18.4 C0.6 -18.6 2.2 -18.4 3.2 -17.6 C2.8 -16.4 1.4 -15.8 0.2 -16.2 C-0.2 -16.8 -0.6 -17.6 -0.6 -18.4 Z', null);
      paint(c, '#b79580', profile ? 'M2.2 -16.8 C3 -16.4 3.6 -15.6 3.5 -14.8 L2.2 -15.2 Z' : 'M0 -16.4 C1 -16.2 2.2 -16.6 2.9 -17.4 C2.9 -16 1.8 -14.8 0.6 -14.8 C0.2 -15.3 0 -15.9 0 -16.4 Z', null);
      // Jaw shadow: a cool plane, never a black line.
      paint(c, '#9c7f6c', profile ? 'M0 -13.6 C2 -12.8 4 -12.6 5.4 -13.6 L4.8 -14.9 L0 -14.8 Z' : 'M-2.6 -13.6 C-1 -12.6 1.4 -12.4 3.4 -13.4 L2.8 -14.9 L-2.2 -14.9 Z', null);
      // Nose: a narrow lit ridge, a small tip, an alar shadow. Never a bright blob.
      paint(c, '#f5dfc2', profile ? 'M4.2 -20 C5 -19.4 5.5 -18.4 5.6 -17.4 L4.8 -17.3 C4.5 -18.2 4.2 -19.1 3.8 -19.7 Z' : 'M0.3 -19.8 C0.8 -19 1 -18 0.9 -17.4 L0.1 -17.3 C0 -18.2 -0.1 -19.1 -0.2 -19.7 Z', null);
      paint(c, '#fdf3de', profile ? 'M5.3 -17.5 L6.4 -17.3 L6.1 -16.6 L5.2 -16.8 Z' : 'M0.3 -17.6 L1.5 -17.4 L1.4 -16.7 L0.3 -16.9 Z', null);
      paint(c, '#9c7d69', profile ? 'M4.9 -16.6 C5.5 -16.4 6 -16.5 6.3 -16.8 L6.1 -16 C5.5 -15.8 5 -15.9 4.7 -16.1 Z' : 'M-0.8 -16.8 C-0.2 -16.6 0.3 -16.6 0.8 -16.8 L0.8 -16.1 C0.2 -15.9 -0.4 -15.9 -0.8 -16.2 Z', null);
      line(c, '#5f4a3e', 0.35, profile ? 'M5 -16.7 C5.5 -16.6 5.9 -16.8 6.2 -17.1' : 'M-0.6 -16.8 C-0.1 -16.7 0.4 -16.9 0.7 -17.2');
      // Eye sockets: a dark recess first, then lid, sclera, iris and a catchlight.
      // The recess is what survives at 1x; the iris is the reward when you lean in.
      const eyeX = profile ? 3.1 : quarter ? 2.4 : 2;
      const socket = (x, w) => 'M' + (x - w) + ' -19.4 C' + (x - w) + ' -20.2 ' + (x + w) + ' -20.2 ' + (x + w) + ' -19.3 C' + (x + w) + ' -18.5 ' + (x - w) + ' -18.5 ' + (x - w) + ' -19.4 Z';
      paint(c, 'rgba(66,48,40,.55)', socket(eyeX, 1.35), null);
      if (!profile) paint(c, 'rgba(66,48,40,.5)', socket(quarter ? -2.3 : -2, 1.15), null);
      line(c, '#44301f', 1, 'M' + (eyeX - 1.7) + ' -20.7 C' + (eyeX - 0.5) + ' -21.1 ' + (eyeX + 0.6) + ' -21 ' + (eyeX + 1.6) + ' -20.5');
      line(c, '#44301f', 0.55, 'M' + (eyeX - 1.3) + ' -19.7 C' + (eyeX - 0.4) + ' -20.25 ' + (eyeX + 0.4) + ' -20.25 ' + (eyeX + 1.2) + ' -19.65');
      paint(c, '#f6f2e4', 'M' + (eyeX - 0.9) + ' -19.5 C' + (eyeX - 0.6) + ' -18.95 ' + (eyeX + 0.6) + ' -18.95 ' + (eyeX + 0.95) + ' -19.45 C' + (eyeX + 0.5) + ' -19.1 ' + (eyeX - 0.5) + ' -19.1 ' + (eyeX - 0.9) + ' -19.5 Z', null);
      paint(c, '#23404c', 'M' + (eyeX - 0.25) + ' -19.5 C' + (eyeX + 0.25) + ' -19.53 ' + (eyeX + 0.3) + ' -18.95 ' + eyeX + ' -18.93 C' + (eyeX - 0.3) + ' -18.95 ' + (eyeX - 0.3) + ' -19.45 ' + (eyeX - 0.25) + ' -19.5 Z', null);
      paint(c, '#0c171f', 'M' + (eyeX - 0.06) + ' -19.45 C' + (eyeX + 0.12) + ' -19.47 ' + (eyeX + 0.13) + ' -19.07 ' + eyeX + ' -19.05 C' + (eyeX - 0.1) + ' -19.07 ' + (eyeX - 0.1) + ' -19.41 ' + (eyeX - 0.06) + ' -19.45 Z', null);
      line(c, '#fffdf2', 0.36, 'M' + (eyeX + 0.16) + ' -19.41 L' + (eyeX + 0.25) + ' -19.32');
      line(c, '#e8dcc6', 0.3, 'M' + (eyeX - 0.7) + ' -18.7 C' + (eyeX - 0.2) + ' -18.55 ' + (eyeX + 0.35) + ' -18.6 ' + (eyeX + 0.75) + ' -18.73');
      if (!profile) {
        const x = quarter ? -2.3 : -2;
        line(c, '#44301f', 0.95, 'M' + (x - 1.3) + ' -20.7 L' + (x + 1.1) + ' -20.85');
        line(c, '#44301f', 0.55, 'M' + (x - 1.1) + ' -19.7 C' + (x - 0.3) + ' -20.25 ' + (x + 0.4) + ' -20.2 ' + (x + 0.9) + ' -19.8');
        paint(c, '#f4f0e2', 'M' + (x - 0.7) + ' -19.5 C' + (x - 0.4) + ' -18.95 ' + (x + 0.55) + ' -18.95 ' + (x + 0.8) + ' -19.45 C' + (x + 0.4) + ' -19.1 ' + (x - 0.4) + ' -19.1 ' + (x - 0.7) + ' -19.5 Z', null);
        paint(c, '#23404c', 'M' + (x - 0.2) + ' -19.5 C' + (x + 0.22) + ' -19.53 ' + (x + 0.26) + ' -18.95 ' + x + ' -18.93 C' + (x - 0.26) + ' -18.95 ' + (x - 0.26) + ' -19.45 ' + (x - 0.2) + ' -19.5 Z', null);
        paint(c, '#0c171f', 'M' + (x - 0.04) + ' -19.45 C' + (x + 0.1) + ' -19.47 ' + (x + 0.11) + ' -19.07 ' + x + ' -19.05 C' + (x - 0.09) + ' -19.07 ' + (x - 0.09) + ' -19.41 ' + (x - 0.04) + ' -19.45 Z', null);
        line(c, '#fffdf2', 0.32, 'M' + (x + 0.13) + ' -19.41 L' + (x + 0.21) + ' -19.32');
        line(c, '#e8dcc6', 0.3, 'M' + (x - 0.55) + ' -18.7 C' + (x - 0.15) + ' -18.57 ' + (x + 0.3) + ' -18.61 ' + (x + 0.65) + ' -18.72');
      }
      // Mouth: philtrum, upper lip shaded, lower lip lit, corner crease.
      line(c, '#7f6355', 0.32, profile ? 'M5.4 -15.8 L5.5 -15' : 'M0.1 -15.9 L0.1 -15.1');
      paint(c, '#8f6555', profile ? 'M2.8 -14.9 C3.6 -15.2 4.4 -15.2 5.2 -14.9 C4.4 -14.4 3.6 -14.4 2.8 -14.9 Z'
        : 'M-1.9 -14.8 C-1.1 -15.3 0.6 -15.3 1.9 -14.7 C1.9 -14.3 1 -14.1 0 -14.1 C-1 -14.1 -1.7 -14.3 -1.9 -14.8 Z', null);
      paint(c, '#cf9f88', profile ? 'M3 -14.5 C3.8 -14.2 4.5 -14.2 5 -14.4 C4.4 -13.8 3.6 -13.8 3 -14.5 Z'
        : 'M-1.5 -14.3 C-0.7 -13.9 0.8 -13.9 1.7 -14.3 C1.2 -13.6 -0.8 -13.6 -1.5 -14.3 Z', null);
      line(c, '#654c41', 0.45, profile ? 'M2.8 -14.7 L5.2 -14.7' : 'M-1.7 -14.6 C-0.5 -14.4 0.9 -14.4 1.9 -14.6');
      line(c, '#7d6154', 0.35, profile ? 'M5.2 -15.1 C5.5 -14.9 5.5 -14.4 5.2 -14.2' : 'M-1.9 -15 C-2.2 -14.8 -2.2 -14.3 -1.9 -14.1');
      // Chin light and a short shadow under the lower lip.
      paint(c, '#f9e9cd', profile ? 'M3 -13.2 C3.8 -13 4.4 -13.1 4.8 -13.4 C4.2 -12.7 3.4 -12.7 3 -13.2 Z'
        : 'M-1.4 -13.4 C-0.6 -13 0.7 -13 1.5 -13.4 C1 -12.7 -0.9 -12.7 -1.4 -13.4 Z', null);
      line(c, '#9d7f6b', 0.3, profile ? 'M3.2 -13.8 L4.6 -13.8' : 'M-1.2 -13.9 C-0.4 -13.7 0.6 -13.7 1.3 -13.9');
      // A fine scar and stubble kept subordinate to the light planes of the face.
      line(c, '#9d7d68', 0.28, 'M-3 -17.3 L-2.3 -15.9 M1 -13.1 L1.3 -12.5 M2.3 -13.4 L2.5 -12.8');
      // Cool moonlight along the lit edge of the face; the scene is night.
      line(c, RIM, 0.5, profile ? 'M-3 -23 C1 -24 5 -23 6 -21' : quarter ? 'M-4 -23 C-1 -24 4 -23 5 -21' : 'M-5 -23 C-3 -24 3 -24 5 -22');
    } else {
      // Back of the head: three hair planes and a nape shadow, not one flat blob.
      paint(c, grad(c, -6, -24, 5, -12, ['#2f3944', '#212932', '#0f151c']),
        'M-5 -23 C-8 -20 -7 -16 -5 -14 L-3 -12 L0 -14 L3 -12 L6 -15 C7 -18 6 -22 5 -23 Z');
      line(c, '#4a5560', 0.55, 'M-5 -20 C-6 -17 -5 -15 -4 -14 M-2 -19 L-2 -15 M2 -18 L3 -15');
      line(c, '#3b444d', 0.35, 'M-6.4 -21 C-7.2 -18 -6.6 -16 -5.8 -14.8 M-3.6 -22 L-4.4 -18 M3.4 -21 L4.2 -17');
      line(c, '#6f7b86', 0.3, 'M-4 -21.6 L-4.6 -19 M1.4 -22 L1 -19.4');
      paint(c, '#1d1715', 'M-3 -13.6 C-1 -12.8 1.6 -12.8 3.4 -13.6 L3 -14.6 L-2.6 -14.6 Z', null);
      if (view === 'rearquarter') {
        paint(c, '#cbb49a', 'M5 -20 C7 -21 8 -19 7 -17 L5 -16 Z', INK, 0.5);
        paint(c, '#927863', 'M5.6 -19.3 C6.3 -19.5 6.8 -18.6 6.2 -17.9 C5.9 -18.3 5.6 -18.8 5.6 -19.3 Z', null);
        line(c, '#7a6254', 0.32, 'M6 -19 L6.4 -18');
      }
      line(c, RIM, 0.5, 'M-5 -23 C-8 -20 -7 -16 -5 -14');
    }
    // A low cocked tricorn: crown -28, brim -23.5; face -23..-12 stays exposed.
    // Painted with view-specific 3D perspective geometry so the 8-directional profile reads crisp.
    const back = view === 'back', rearQ = view === 'rearquarter';
    if (back) {
      // Direct back: high arched crown, swept-up rear brim wings left & right, central nape cleft.
      paint(c, grad(c, -6, -28.5, 6, -23, ['#4c5c66', '#222d36', '#0d161d']),
        'M-5 -24 C-5 -26.5 -3 -28.2 0 -28.2 C3 -28.2 5 -26.5 5 -24 L-5 -24 Z', INK, 0.85);
      paint(c, '#1a242c', 'M-4 -25.5 C-2 -27 2 -27 4 -25.5 L4.5 -24 L-4.5 -24 Z', null);
      line(c, '#687780', 0.45, 'M-3 -27 C0 -27.8 3 -27 4 -26');
      line(c, RIM, 0.55, 'M-5 -26 C-2 -28 2 -28 5 -26');
      paint(c, grad(c, -8, -24.5, 8, -22, ['#1c262e', '#10171d', '#080d12']),
        'M-8.5 -24.8 C-5 -22.8 -1 -23.2 0 -23.6 C1 -23.2 5 -22.8 8.5 -24.8 L9 -23.6 C6 -22.2 2 -22.6 0 -22.8 C-2 -22.6 -6 -22.2 -9 -23.6 Z', INK, 0.75);
      paint(c, '#2b3840', 'M-8 -24.2 C-5 -22.8 0 -23.2 3 -23.6 L0 -23 C-3 -22.8 -6 -22.4 -8 -23.6 Z', null);
      line(c, '#7e9096', 0.55, 'M-8.2 -24.4 C-4 -23 4 -23 8.2 -24.4');
      paint(c, '#141d24', 'M-1.5 -24.5 L1.5 -24.5 L2 -23.5 L-2 -23.5 Z', null);
      line(c, '#b39762', 0.5, 'M-1.2 -24 L1.2 -24');
      line(c, '#33271c', 0.6, 'M-0.8 -23.5 L-1.4 -19 M0.8 -23.5 L1.4 -19');
      line(c, '#9e8555', 0.35, 'M-0.7 -23.2 L-1.2 -19.4 M0.7 -23.2 L1.2 -19.4');
    } else if (rearQ) {
      // 3/4 Back: angled crown, far wing tapering, near wing broad and upturned
      paint(c, grad(c, -6, -28, 5, -23, ['#50606a', '#24303a', '#0e1820']),
        'M-6 -24 C-6 -26.2 -3.5 -27.8 -0.5 -28 L3.5 -27.2 C4.8 -25.6 5.8 -24.6 6.5 -23.8 L-6 -23.8 Z', INK, 0.85);
      paint(c, '#202a32', 'M-5 -25 L-2 -26.5 2 -25.8 L5 -24.2 L-5 -24.2 Z', null);
      line(c, '#6f7e88', 0.45, 'M-3.5 -26.8 L0 -27.2 M2 -26.8 L4 -26');
      line(c, RIM, 0.55, 'M-5.8 -26 C-3.5 -27.6 -1 -28 1 -28');
      paint(c, grad(c, -8.5, -24.4, 7.5, -22, ['#1f2a32', '#111920', '#090f15']),
        'M-8.8 -24.6 C-5 -22.6 -2 -24.2 0 -24.4 C3 -24.4 5.5 -22.8 8 -24.5 L8.6 -23.5 C5.8 -22.3 2 -22.6 0 -22.8 C-4 -22.6 -6.8 -22.2 -9.2 -23.6 Z', INK, 0.75);
      line(c, '#85979f', 0.6, 'M-8.4 -24.3 C-5 -23.2 -2 -23.9 0 -24 M2 -23.7 L7.4 -24.2');
      line(c, RIM, 0.55, 'M-9 -24.6 C-5 -23.2 -2 -24 0 -24.2');
      line(c, '#8f764a', 0.5, 'M-3 -24.6 L3 -24.5');
      buckle(c, 2.2, -25.6, 1.5, 1.3);
      line(c, '#2d2217', 0.55, 'M0.6 -23.5 L0.2 -19.5');
    } else if (profile) {
      // Side profile: sleek forward visor, high swept-up side cockade wing, low nape
      paint(c, grad(c, -6, -28.2, 5, -23, ['#5a6c76', '#283540', '#101c25']),
        'M-5.5 -23.8 C-5.5 -26 -3 -28 0.5 -28.2 L3 -27.5 C4.5 -25.8 5.8 -24.6 7.2 -23.6 L-5.5 -23.6 Z', INK, 0.85);
      paint(c, '#2a3742', 'M-4.5 -24.8 L-1.5 -26.5 L1 -26 L5 -24.2 L-4.5 -24.2 Z', null);
      line(c, '#788892', 0.45, 'M-3 -26.6 L-0.5 -27.2 M1.5 -27 L4 -26.2');
      line(c, RIM, 0.6, 'M-5.5 -25.8 C-3 -27.6 0 -28.2 2 -28');
      paint(c, '#1b262f', 'M-5 -24.8 L6.2 -24.8 L6 -23.8 L-5 -23.8 Z', null);
      line(c, '#a48e5d', 0.5, 'M-4.6 -24.3 L5.6 -24.3');
      paint(c, grad(c, -8, -24.4, 7.5, -22, ['#24323c', '#131e26', '#0a1219']),
        'M-8.2 -24.4 C-4.5 -22.4 -1 -24.4 2 -24.4 C4 -24.4 6 -22.5 8 -24.2 L8.6 -23.3 C6 -22.1 3 -22.4 1 -22.7 C-3 -22.5 -5.8 -22.2 -8.8 -23.4 Z', INK, 0.75);
      paint(c, '#33434c', 'M-7.8 -24 C-4 -22.8 -1 -23.6 1 -23.8 L2 -23 C-1 -22.8 -4 -22.4 -8 -23.6 Z', null);
      line(c, '#93a6ad', 0.65, 'M-8 -24.2 C-4 -22.9 -1 -23.7 1 -23.8 M3.5 -23.5 L7.6 -24');
      line(c, RIM, 0.55, 'M-8.4 -24.5 C-4 -23.2 -1 -24 1 -24.1');
      line(c, '#ab9366', 0.7, 'M-2 -24.6 C1 -25.2 3 -24.9 5 -24.4');
      buckle(c, 3.2, -25.8, 1.8, 1.4);
    } else if (quarter) {
      // 3/4 Front: dynamic perspective! Right brim tip sharply cocked forward, left wing swept back
      paint(c, grad(c, -6, -28, 5, -23, ['#586a74', '#283540', '#101b24']),
        'M-6 -24 C-6 -26.2 -3.8 -27.6 -1.5 -27.6 L0.5 -28 L4.5 -26.8 C5.6 -25.2 6.5 -24.2 7.5 -23.5 L-6 -23.5 Z', INK, 0.85);
      paint(c, '#293641', 'M-5.8 -25 L-2.8 -26.4 L-0.8 -27 L0.5 -25.2 L5.5 -24.3 L-5.8 -24.3 Z', null);
      line(c, '#76858e', 0.45, 'M-3.8 -26.5 L-1.8 -26.9 M1.2 -27.1 L3.5 -26.4');
      line(c, RIM, 0.55, 'M-6 -26 C-3.8 -27.5 -1.5 -28 0.5 -28');
      paint(c, '#1d2a34', 'M-5.6 -24.9 L6 -24.9 L5.8 -23.9 L-5.4 -23.9 Z', null);
      line(c, '#9e885a', 0.5, 'M-5.2 -24.4 L5.4 -24.4');
      paint(c, grad(c, -9, -24.4, 8, -22, ['#23313b', '#131d25', '#0b131a']),
        'M-9.2 -24.4 C-5 -22.3 -3.5 -24.4 -0.5 -24.4 C2.5 -24.4 4.5 -22.3 8.2 -24.4 L9.2 -23.4 C6.2 -22.1 2.2 -22.4 0.2 -22.8 C-3.8 -22.6 -6.8 -22.2 -9.8 -23.4 Z', INK, 0.75);
      paint(c, '#314149', 'M-8.8 -24 C-5 -22.8 -2.5 -23.6 -0.5 -23.8 L0.5 -23 C-2.5 -22.8 -5.5 -22.4 -8.8 -23.6 Z', null);
      line(c, '#8fa2a9', 0.65, 'M-9 -24.2 C-5 -22.9 -2.5 -23.7 -0.5 -23.8 M3.5 -23.5 L7.8 -24.1');
      line(c, RIM, 0.55, 'M-9.4 -24.5 C-5 -23.2 -2.5 -24 -0.5 -24.1');
      line(c, '#aa9369', 0.7, 'M-3.5 -24.6 C0.5 -25.2 2.5 -24.9 4.5 -24.4');
      buckle(c, 2.8, -25.6, 1.6, 1.3);
    } else {
      // Front: iconic peaked tricorn with symmetrical curved brim flaps & centered visor peak
      paint(c, grad(c, -6, -28.2, 6, -23, ['#586b76', '#283641', '#101c25']),
        'M-6 -24 C-6 -26.5 -3.5 -28 0 -28 C3.5 -28 6 -26.5 6 -24 L-6 -24 Z', INK, 0.85);
      paint(c, '#293742', 'M-5.5 -25 L-2.5 -26.6 L0 -27 L2.5 -26.6 L5.5 -25 L-5.5 -25 Z', null);
      line(c, '#788891', 0.45, 'M-4 -26.5 L-1.5 -27.1 M1.5 -27.1 L4 -26.5');
      line(c, RIM, 0.55, 'M-6 -26.2 C-3 -28 3 -28 6 -26.2');
      paint(c, '#1d2a35', 'M-5.8 -24.9 L5.8 -24.9 L5.6 -23.9 L-5.6 -23.9 Z', null);
      line(c, '#a08a5b', 0.5, 'M-5.4 -24.4 L5.4 -24.4');
      paint(c, grad(c, -9.5, -24.5, 9.5, -22, ['#23323c', '#131e26', '#0b131b']),
        'M-9.5 -24.6 C-5 -22.2 0 -23.6 0 -23.6 C0 -23.6 5 -22.2 9.5 -24.6 L9.8 -23.4 C6.5 -22.1 2 -22.6 0 -22.8 C-2 -22.6 -6.5 -22.1 -9.8 -23.4 Z', INK, 0.75);
      paint(c, '#32424b', 'M-9 -24 C-5 -22.7 0 -23.2 0 -23.2 C0 -23.2 5 -22.7 9 -24 L0 -22.9 Z', null);
      line(c, '#91a4ab', 0.65, 'M-9.2 -24.3 C-5 -22.9 -1 -23.4 0 -23.4 M1 -23.4 C5 -22.9 9.2 -24.3 9.2 -24.3');
      line(c, RIM, 0.55, 'M-9.5 -24.6 C-5 -23.2 -1 -23.8 0 -23.8 M1 -23.8 C5 -23.2 9.5 -24.6 9.5 -24.6');
      line(c, '#ab946b', 0.7, 'M-3.5 -24.8 C0 -25.3 3.5 -24.8 3.5 -24.8');
      buckle(c, 2.6, -25.6, 1.6, 1.3);
    }
  }

  function hem(c, side) {
    c.save(); c.scale(side, 1);
    paint(c, grad(c, -8, 7, 1, 19, ['#274050', '#162a36', '#0a161f']),
      'M-7.6 6 C-5 7 -2 7 0 7 L-1 11 C-2 13.6 -1 15.4 -2 16.4 C-4 15.6 -5.4 17 -9 15.4 L-9.6 13.6 C-8 11 -7.6 9 -7.6 6 Z');
    paint(c, '#1e3644', 'M-6.6 8 L-3 8 C-5 11 -3 13.4 -4 15.8 L-7 15 C-6.4 12 -7.6 10.4 -6.6 8 Z', null);
    // Vertical drape folds from waist to hem instead of a flat skirt.
    line(c, '#6d8794', 0.5, 'M-8 8 C-8 12 -9 15 -10 16');
    line(c, '#0a1620', 0.7, 'M-2 9 C-4 13 -3 16 -2.5 18');
    line(c, '#08141d', 0.6, 'M-5.6 8.6 C-6.4 12 -5.8 15.4 -6.4 18');
    // The hem underside is richer in shadow — cloth thickness reads at 1x.
    paint(c, '#061019', 'M-2 16.4 C-4 15.6 -5.4 17 -9 15.4 L-9 16.8 C-6.4 18.2 -4 17.2 -2 18 Z', null);
    line(c, WARM, 0.55, 'M-9.4 15 C-6.4 16.6 -3.6 15.4 -2.4 16.8');
    c.restore();
  }
  function leg(c) {
    // Trouser: thigh volume tapers to a knee break, then a separate shin panel.
    paint(c, grad(c, -3, 0, 3, 9, ['#31404d', '#1c2731', '#0b1218']),
      'M-3 0 C-1 -1.2 2 -1.2 3 0 L2.6 4.6 L3 9 C1 10 -2 10 -3 9 L-2.4 4.6 Z');
    paint(c, '#25323d', 'M-2 1 L0 0 L0.5 4 L-1.5 7 L-2 9 Z', null);
    // Knee break and the cloth pucker above it — what makes a leg bend, not a tube.
    line(c, '#08111a', 0.75, 'M-2.7 4.7 C-1 3.8 1 3.8 2.7 4.7');
    line(c, '#7c868d', 0.45, 'M-2.1 5.3 L1.6 5.3');
    line(c, '#0d151e', 0.45, 'M-2.2 3.4 C-1 3.9 0.8 3.9 2 3.5');
    line(c, '#1a232d', 0.45, 'M1.6 1 L1.8 4 M-0.4 7 L0 8');
    // Down-lit seam on the outer thigh.
    line(c, '#96a7b2', 0.45, 'M-2.4 0.6 C-2.6 2 -2.5 3.2 -2.3 4.2');
  }
  function boot(c) {
    // Leather boot: shaft, instep break, toe box, welt and a wet sole highlight.
    paint(c, grad(c, -3, 0, 3, 9, ['#4c3c33', '#241f20', '#0a0f14']),
      'M-2.9 0 C-1 0 1 0 2.8 0 L2.4 4 C3.2 5 5 5.5 5.5 7 C5.8 8 4.5 9 1 9 L-3 9 C-4 7 -3.5 5 -3 4 Z', INK, 0.85);
    // Instep crease and toe cap separate the foot into planes.
    paint(c, '#5b4a3c', 'M-2.6 1.2 C-1.4 0.6 0.8 0.6 2.4 1.2 L2.1 3.6 C0.4 3 2 3.4 -2.4 3.4 Z', null);
    paint(c, '#6a5849', 'M1.2 5.4 C2.6 5.2 4.4 5.8 5.2 6.8 C4.4 7.8 2.6 8.2 1 8.1 Z', null);
    line(c, '#0c1218', 0.6, 'M-2.4 4.1 C0 3.3 2.6 3.7 4.4 4.9');
    // Welt and sole — a light line here is what stops the foot floating.
    paint(c, '#0a1219', 'M-3.8 7 C-1 8 3 8 5.5 7 L5.5 9 C2 10 -1 10 -3.7 9 Z', INK, 0.6);
    line(c, '#6f7d81', 0.55, 'M-3.5 8.4 C-1 9 2 9 5.2 8.2');
    paint(c, '#2c343b', 'M-2 1 L-0.8 1 L-0.9 5 L-2.5 6 Z', null);
    line(c, '#8a7154', 0.4, 'M-1.5 1.5 L1 2.3 M1 1.5 L-1.4 2.3 M-1.5 3 L1 3.8 M1 3 L-1.5 3.8');
    line(c, '#5c666e', 0.45, 'M1 6 C2.5 5.8 4 6.5 4.5 7');
    buckle(c, 1.2, 0.7, 1.3, 1.1);
  }
  function cape(c) {
    paint(c, grad(c, -13, -10, 1, 10, [CAPE_HI, CAPE, CAPE_DARK]),
      'M-4 -11 C-9 -12 -13 -9 -13 -6 C-13 -3 -15 1 -15 4 L-12 3 L-13 7 C-10 6 -8 8 -5 6 C-4 3 -1 1 0 -3 L0 -8 Z', INK, 0.9);
    paint(c, '#35505f', 'M-6 -9 C-10 -8 -10 -4 -11 0 L-9 2 L-7 0 C-5 -3 -3 -4 -2 -7 Z', null);
    // Deep inner fold and the far edge turned away from the light.
    paint(c, '#0f1b26', 'M-13 -6 C-13 -3 -15 1 -15 4 L-13.4 3.6 C-13.4 0.6 -12 1 -11.6 -2 Z', null);
    line(c, '#8fa0ac', 0.7, 'M-12 -7 C-11 -9 -8 -10 -5 -10');
    line(c, '#16242f', 0.7, 'M-9 -5 C-10 -1 -11 2 -12 4 M-5 -7 C-5 -3 -7 2 -7 5');
    // Vertical wool ribs: the cape reads as fabric with weight, not a flag.
    line(c, '#2b4152', 0.5, 'M-10.6 -8 C-11.4 -4.6 -12.2 -1.4 -12.8 2.4 M-7.4 -9 C-7.8 -5 -8.6 -1.4 -9 2.6');
    // Moonlit rim along the shoulder and the hanging edge.
    line(c, RIM, 0.55, 'M-12.6 -7.4 C-11.6 -9.4 -8.6 -10.4 -5.2 -10.4 M-15 4 L-13.2 6.8');
    paint(c, '#7c5f3c', 'M-4 -9 C-3 -10 -1 -10 0 -9 L0 -7 C-1 -6 -3 -7 -4 -8 Z', INK, 0.5);
    line(c, '#efcb8e', 0.55, 'M-2.8 -8.7 L-1.2 -8.7');
  }
  function scarf(c) {
    paint(c, grad(c, -5, -12, 5, -7, ['#f8dc9c', '#d1a258', '#87602f']),
      'M-5 -12 C-2 -10 3 -10 5 -12 L6 -9 C3 -7 -2 -7 -5 -9 Z', INK, 0.6);
    // Knit ribs and the rolled edge make the scarf read as wool around the throat.
    line(c, '#fbe0a2', 0.7, 'M-4 -10.7 C-1 -9.2 2 -9.2 4.5 -10.8');
    line(c, '#8e6a3a', 0.5, 'M-3 -8.8 C0 -8.1 2 -8.5 4 -9.2');
    line(c, '#a87c41', 0.32, 'M-3.4 -11.2 L-2.8 -8.6 M-1.2 -10.6 L-0.9 -8.2 M1 -10.6 L1.2 -8.4 M3.2 -11.2 L3 -8.8');
    paint(c, '#f6d492', 'M-5.4 -11.9 C-2.6 -10.4 2.6 -10.4 5.4 -11.9 L5.6 -11.2 C2.6 -9.7 -2.6 -9.7 -5.6 -11.2 Z', null);
  }
  function scarfTail(c) {
    paint(c, grad(c, 0, 0, 5, 11, ['#e6c47f', '#b58849', '#66462d']),
      'M0 0 L3 -0.5 C3 2 2 3 3 5 C4 7 6 8 5 11 L1 11.5 C2 8 0 6 0 4 Z', INK, 0.55);
    line(c, '#f8d68c', 0.5, 'M1.4 1 C1 4 3.7 8 3 10');
    // Ribs run along the tail; frayed ends catch the lantern.
    line(c, '#a97e44', 0.3, 'M1 1.4 C1.2 4.4 3.2 7.6 2.6 10.4 M2.2 0.6 C2.4 3.6 4.4 6.8 3.8 10.2');
    line(c, '#5c432d', 0.3, 'M1.5 10 L1.1 12 M2.7 10.4 L2.3 12 M4 10.2 L3.8 11.8');
  }
  function lantern(c) {
    // The brass cage and warm glass are baked; glow never becomes a frame gradient.
    // Glass center remains local (0, 4) for exact anchors contract.
    line(c, '#bfa46e', 0.85, 'M-2.2 -1.5 C-4.5 -6 4.5 -6 2.2 -1.5');
    paint(c, '#2b2116', 'M-3.5 0 L-1.5 -2 L1.5 -2 L3.5 0 L4 1 L-4 1 Z', INK, 0.6);
    paint(c, '#5c4528', 'M-2 -1.8 L2 -1.8 L2.5 -0.8 L-2.5 -0.8 Z', null);
    line(c, BRASS_HI, 0.45, 'M-1.8 -1.2 L1.8 -1.2');
    line(c, '#120d09', 0.5, 'M-2 -0.2 L-1.4 -0.2 M-0.4 -0.2 L0.4 -0.2 M1.4 -0.2 L2 -0.2');
    paint(c, grad(c, -2.6, 1, 2.6, 7, ['#fff8d0', '#f7c36a', '#a66224']),
      'M-2.5 1 L2.5 1 L2.9 7 C1.2 7.9 -1.2 7.9 -2.9 7 Z', '#4a3627', 0.55);
    paint(c, 'rgba(255,255,255,.45)', 'M-2.2 1.2 L-1.2 1.2 L-1.5 6.6 L-2.5 6.6 Z', null);
    paint(c, '#fffde0', 'M0 2.2 C-0.7 3.2 -0.8 4.6 0 5.4 C0.8 4.6 0.7 3.2 0 2.2 Z', null);
    paint(c, '#fff', 'M0 3 C-0.3 3.6 -0.3 4.4 0 4.8 C0.3 4.4 0.3 3.6 0 3 Z', null);
    line(c, '#543b1f', 0.4, 'M0 5.2 L0 6.5');
    for (const x of [-2.6, -0.9, 0.9, 2.6]) {
      line(c, '#7d5e32', 0.55, 'M' + x + ' 1 L' + x + ' 7');
      line(c, BRASS_HI, 0.3, 'M' + (x + 0.15) + ' 1.2 L' + (x + 0.15) + ' 6.8');
    }
    paint(c, grad(c, -3.2, 7, 3.2, 9, ['#573f24', '#382715', '#1a1209']),
      'M-3.2 7 L3.2 7 L3.4 8.6 C1.2 9.2 -1.2 9.2 -3.4 8.6 Z', INK, 0.6);
    line(c, BRASS_HI, 0.5, 'M-2.5 0.4 L2.5 0.4 M-2.8 7.8 L2.8 7.8');
    line(c, '#e6c888', 0.4, 'M-1.8 8.4 L1.8 8.4');
  }
  function sleeve(c, fore) {
    // Upper arm is a tapered tube with a rolled shoulder cap; forearm has a cuffroll.
    paint(c, grad(c, 0, -2, 10, 4, ['#40606f', '#223d4c', '#0f1e28']), fore
      ? 'M6 1 C8 0 11 -0.5 14 0 L14 3 C11 4 8 5 6 4 Z'
      : 'M0 -6 C2 -6.5 4 -6 5 -4 L8 1 L8 4 C5 6 2 4 0 3 C-1.4 -1 -1.4 -4 0 -6 Z');
    if (!fore) {
      // Shoulder cap: a separate rounded panel so the joint has volume, kept quieter than the torso.
      paint(c, grad(c, 0, -7, 5, -1, ['#43616f', '#22404e', '#12242e']),
        'M-0.6 -6.4 C2 -7 4.6 -6.2 5.6 -4 C4.4 -1.4 2 0 0.4 -0.4 C-0.8 -2.4 -1.2 -5 -0.6 -6.4 Z', INK, 0.6);
      line(c, '#9cb9c5', 0.5, 'M-0.2 -6 C2 -6.8 4.2 -6 5.2 -4');
      // Elbow crease where the two segments meet.
      line(c, '#122530', 0.65, 'M6.6 -0.4 C7 1.4 6.6 3 5.2 4.4');
    }
    line(c, RIM_SOFT, 0.45, fore ? 'M7 1.2 L12 0.9' : 'M1 -1 L4 -0.4');
    if (fore) {
      paint(c, '#1a2b36', 'M11 -0.1 L13.8 0 L13.5 3.5 L11.5 3.8 Z');
      line(c, '#98c7d0', 0.45, 'M12 0.3 L12.4 3.1');
      // Two cloth folds across the forearm, lit on the upper edge.
      line(c, '#12232e', 0.5, 'M7.6 0.2 C8 1.5 7.6 2.6 7.2 3.4 M9.2 0.1 C9.6 1.4 9.3 2.6 8.9 3.5');
    } else line(c, '#142430', 0.65, 'M5 0 L4 2 L6 4');
  }
  function glove(c, support) {
    // Glove: wrist band, back of hand, then knuckles separated by dark seams.
    paint(c, grad(c, -1, -1, 3, 4, ['#86674f', '#463b33', '#1f282b']), support
      ? 'M-2 0 C-1 -1 1 -1 3 0 L3.5 2 C2 3 0 3.5 -2 2 Z'
      : 'M-1 0 C0 -1 2 -1 3.5 0 L4 2 L3 3 L2 5 C0 5 -1 3 -1 2 Z', INK, 0.6);
    line(c, '#b89b72', 0.4, 'M0 0 L1 0.5 M1.7 0 L2.6 0.7');
    // Knuckle shadow and finger seams read as a hand, not a mitten.
    line(c, '#141b1e', 0.45, support ? 'M-0.6 1.9 L2.2 1.9 M0.4 1.4 L0.6 2.4' : 'M-0.4 2.1 L2.6 2.1 M0.2 2.5 L0.4 3.6 M1.3 2.5 L1.4 3.8');
    paint(c, '#a4855f', support ? 'M-1.6 0.2 L-1.9 1.8 L-0.6 1.9 Z' : 'M-0.6 0.2 L-1 1.9 L0.2 2 Z', null);
    line(c, '#1a1f20', 0.45, 'M0 2 L2.8 2');
  }
  function idleArm(c) {
    paint(c, grad(c, -3, 0, 2, 13, ['#2e4a59', '#1c3341', '#0c1922']),
      'M-2 0 C0 -1 2 0 2 3 L1 7 L0 11 L-3 11 L-3.7 7 C-4 3 -3 1 -2 0 Z');
    line(c, '#7d95a3', 0.6, 'M-2.5 2 L-3 5 M-2.7 7 L-2.2 9');
    paint(c, '#3a2d25', 'M-3 10 L0 10 L1 12 C1 14 -1 14 -2 13 L-3 12 Z');
    line(c, '#a98b66', 0.4, 'M-1.6 11 L-1.1 12.5');
  }

  // Six explicitly drawn outlines; evolution changes metalwork and silhouette.
  const weaponOutlines = {
    pistol: {
      base: 'M10 -2 L14 -3 L21 -2.8 L21 -3.4 L23 -3.4 L24 -2.2 L24 1 L17 1 L16 3 L13 4 L11 8 L7 6 C9 3 10 1 10 -2 Z',
      evolved: 'M8 -3 L12 -4 L13 -6 L15 -4 L21 -4 L22 -5 L24 -3.5 L24 1.5 L19 1.5 L18 3 L14 4 L11 9 L6 6 C8 3 8 1 8 -3 Z'
    },
    shotgun: {
      base: 'M0 0 C3 -1 5 1 8 0 L10 -3 L23 -3 L24 -2 L24 2 L11 2 L8 3 L4 7 L-1 5 L2 2 Z',
      evolved: 'M-2 0 C2 -1 5 1 8 0 L9 -4 L21 -4 L22 -5 L24 -4 L24 2.5 L21 3.5 L10 3 L7 4 L3 8 L-2 5 L1 2 Z'
    },
    repeater: {
      base: 'M2 -1 L7 0 L9 -3 L15 -3 L16 -2 L22 -2 L23 -3 L24 -2 L24 1 L16 1 L15 2 L16 7 L12 8 L10 3 L7 3 L4 6 L0 4 Z',
      evolved: 'M0 -2 L5 -1 L7 -4 L12 -4 L13 -6 L16 -6 L17 -3 L21 -3 L22 -4 L24 -3 L24 1.5 L19 1.5 L17 4 L18 8 L12 10 L9 4 L5 4 L2 7 L-2 4 Z'
    }
  };
  function weapon(c, key, evolved) {
    const outline = weaponOutlines[key][evolved ? 'evolved' : 'base'];
    // Dark gunmetal with one bright top edge: the gun must not melt into the coat.
    const steel = grad(c, 0, -4, 0, 4, [STEEL_HI, STEEL, STEEL_DARK]);
    paint(c, steel, outline, '#0b151c', 0.8);
    line(c, '#e4eef0', 0.5, 'M12 -2.6 L22 -2.6');
    if (key === 'pistol') {
      paint(c, grad(c, 8, 0, 14, 8, ['#7a5638', '#4a3524']), evolved ? 'M9 1 L13 3 L11 8 L7 6 Z' : 'M11 1 L14 3 L11 7 L8 5.5 Z', '#2e241d', 0.5);
      line(c, '#a97c4d', 0.5, 'M11 3 C10 4 10 5 9 5.5');
      line(c, '#5c3e26', 0.35, 'M8.5 4 L11.5 6.5 M9.5 3 L12.5 5.5 M8 5.5 L10 7');
      paint(c, evolved ? '#8a6a3a' : '#3f505c', 'M12 -2.5 C13 -4 17 -3 18 -2 L18 0.7 C16 2 13 1 12 0 Z', INK, 0.5);
      line(c, '#c3d0d1', 0.45, 'M13 -2.1 L17 -2 M14 -1.4 L14 0 M16 -1.4 L16 0');
      line(c, BRASS, 0.7, 'M14 2 C14 5 17 5 17 2');
      line(c, '#f5e6c2', 0.45, 'M19 -2 L23 -2');
      paint(c, '#202a30', 'M10 -1 L9 -3 L11 -2.5 Z', INK, 0.4);
      if (evolved) {
        paint(c, '#e2c47a', 'M12 -4 L13 -6 L15 -4 Z', INK, 0.45);
        line(c, '#fbe4ac', 0.5, 'M18 -3.1 C18.5 -1 20 -2 20.5 -0.5');
        paint(c, '#6f97a6', 'M8 0 L10 -1 L11 1 L9 2 Z', '#edcf86', 0.4);
        line(c, '#fff3c2', 0.5, 'M13 -3.5 L20 -3.5');
        paint(c, '#88e4f8', 'M15 -1 L17 -1 L16 0.5 Z', null);
      }
    } else if (key === 'shotgun') {
      paint(c, grad(c, 0, 1, 4, 6, ['#8d6d48', '#5d442c', '#332a25']),
        evolved ? 'M-1 1 C2 1 4 2 7 1 L9 3 L3 7 L-1 4 L2 2 Z' : 'M0 1 L7 1 L8 3 L4 6 L0 4 L3 2 Z', INK, 0.5);
      paint(c, '#6d4f30', 'M11 1 L19 1 L19 3 L11 3 Z', INK, 0.45);
      line(c, '#c19c62', 0.5, 'M12 1.5 L18 1.5 M13 2 L13 2.6 M15 2 L15 2.6 M17 2 L17 2.6');
      line(c, '#0f202a', 0.6, 'M10 -0.6 L24 -0.6');
      line(c, '#dcecea', 0.55, 'M11 -2.3 L23 -2.3');
      line(c, '#bb9858', 0.7, 'M7 3 C6 6 10 6 10 3');
      line(c, '#2d424e', 0.45, 'M12 -1.5 L23 -1.5 M14 -2 L14 -1 M18 -2 L18 -1 M21 -2 L21 -1');
      if (evolved) {
        paint(c, '#cda867', 'M9 -4 L11 -4 L11 3 L9 3 Z', INK, 0.4);
        paint(c, '#caa564', 'M20 -4 L22 -4 L22 3 L20 3 Z', INK, 0.4);
        line(c, '#f6e8bc', 0.4, 'M14 -3 L17 -3 M14 -2.2 L17 -2.2');
        paint(c, '#a87645', 'M-1 3 L1 3 L2 5 L1 6 Z', INK, 0.4);
        line(c, '#ff9640', 0.5, 'M11 -0.5 L22 -0.5');
      }
    } else {
      paint(c, '#5d4230', 'M2 1 L7 1 L8 3 L4 5 L1 3 Z', INK, 0.45);
      paint(c, '#2c3d47', evolved ? 'M10 2 L16 3 L17 8 L12 9 Z' : 'M11 2 L15 2 L15 6.5 L12 7 Z', INK, 0.5);
      line(c, '#9caeae', 0.45, 'M12 3 L13 6 M13.5 3 L14.5 6');
      paint(c, '#a28450', 'M8 -1 L14 -1 L14 1.3 L8 1.3 Z', INK, 0.4);
      line(c, '#e6cd94', 0.45, 'M9 -0.4 L12 -0.4');
      line(c, '#dceae8', 0.55, 'M16 -1.5 L23 -1.5');
      line(c, '#101f29', 0.7, 'M18 0 L23 0');
      line(c, '#b4915a', 0.65, 'M8 3 C7 5 10 5 10 3');
      line(c, '#64808c', 0.45, 'M3 0 L15 0');
      if (evolved) {
        paint(c, '#436c7e', 'M12 -4 L13 -6 L16 -6 L17 -3 Z', INK, 0.5);
        line(c, '#c6eaec', 0.5, 'M13 -5 L15.5 -5');
        paint(c, '#c49d58', 'M17 -3 L19 -3 L19 1.5 L17 1.5 Z', INK, 0.4);
        line(c, '#f2d898', 0.6, 'M12 7 L15 6.5');
        line(c, '#8ce8f8', 0.5, 'M16 -2.4 L22 -2.4');
      }
    }
    // All barrels terminate exactly at 24, even though stocks differ in length.
    line(c, '#0a131a', 1, 'M24 -1.8 L24 0.8');
    line(c, '#eff3ea', 0.45, 'M22 -1.8 L23 -1.8');
  }
  function flash(c) {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 10);
    g.addColorStop(0, 'rgba(255,246,209,.95)');
    g.addColorStop(0.35, 'rgba(255,194,96,.48)');
    g.addColorStop(1, 'rgba(255,157,58,0)');
    c.fillStyle = g; c.fillRect(-10, -10, 20, 20);
    paint(c, '#ffecc0', 'M-1 -1 L2 -3 L1 -1 L9 0 L2 1 L3 3 L-1 1 Z', null);
    paint(c, '#fffde7', 'M-1 -0.5 L5 0 L-1 0.5 Z', null);
    line(c, '#ffd573', 0.45, 'M1 -2 L3 -4 M1 2 L3 4 M3 0 L7 -2 M3 0 L7 2');
  }

  function init() {
    if (assets) return assets;
    const specs = [];
    const add = (name, dx, dy, w, h, painter) => specs.push({ name, dx, dy, w, h, painter });
    for (const view of views) {
      add('torso-' + view, -16, -12, 32, 26, c => torso(c, view));
      // The head box is four units shorter than the 2026-10-25 pass: the skull and hat
      // shrink toward adult proportions, which is what stopped the hunter reading chibi.
      add('head-' + view, -15, -30, 30, 21, c => head(c, view));
    }
    add('hem-left', -14, 2, 28, 24, c => hem(c, 1));
    add('hem-right', -14, 2, 28, 24, c => hem(c, -1));
    add('leg', -5, -2, 10, 14, leg);
    add('boot', -6, -2, 14, 14, boot);
    add('cape', -18, -14, 24, 26, cape);
    add('scarf', -8, -14, 16, 10, scarf);
    add('scarf-tail', -3, -3, 12, 18, scarfTail);
    add('lantern', -7, -6, 14, 18, lantern);
    add('upper-arm', -3, -8, 14, 16, c => sleeve(c, false));
    add('forearm', 3, -3, 14, 12, c => sleeve(c, true));
    add('glove', -3, -3, 10, 11, c => glove(c, false));
    add('support-glove', -5, -3, 11, 10, c => glove(c, true));
    add('idle-arm', -7, -3, 12, 20, idleArm);
    add('hat-feather', -2, -14, 10, 16, hatFeather);
    add('coat-pin', -4, -4, 8, 11, coatPin);
    add('vial', -4, -4, 8, 12, vial);
    add('gear-pouch', -5, -3, 10, 10, gearPouch);
    add('knee-guard', -4, -2, 8, 7, kneeGuard);
    add('heel', -4, -2, 10, 8, heel);
    for (const key of ['pistol', 'shotgun', 'repeater']) for (const variant of ['base', 'evolved'])
      add(key + '-' + variant, -5, -9, 33, 22, c => weapon(c, key, variant === 'evolved'));
    add('muzzle-flash', -11, -11, 22, 22, flash);
    let x = PAD, y = PAD, rowH = 0;
    const parts = {};
    for (const spec of specs) {
      if (x + spec.w + PAD > ATLAS_W) { x = PAD; y += rowH + PAD * 2; rowH = 0; }
      parts[spec.name] = Object.freeze({ x, y, w: spec.w, h: spec.h, dx: spec.dx, dy: spec.dy });
      x += spec.w + PAD * 2; rowH = Math.max(rowH, spec.h);
    }
    const height = y + rowH + PAD;
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_W * SS; canvas.height = height * SS;
    const c = canvas.getContext('2d');
    c.scale(SS, SS); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const spec of specs) {
      const p = parts[spec.name];
      c.save(); c.beginPath(); c.rect(p.x, p.y, p.w, p.h); c.clip();
      c.translate(p.x - p.dx, p.y - p.dy); spec.painter(c); c.restore();
    }
    const mask = document.createElement('canvas'); mask.width = canvas.width; mask.height = canvas.height;
    const m = mask.getContext('2d'); m.drawImage(canvas, 0, 0);
    m.globalCompositeOperation = 'source-in'; m.fillStyle = '#d2e8ea';
    m.fillRect(0, 0, mask.width, mask.height);
    const weapons = {};
    for (const key of ['pistol', 'shotgun', 'repeater']) {
      weapons[key] = {};
      for (const variant of ['base', 'evolved']) weapons[key][variant] = Object.freeze({
        part: key + '-' + variant, outline: weaponOutlines[key][variant],
        muzzle: Object.freeze({ x: 24, y: 0 }), twoHanded: key !== 'pistol'
      });
      Object.freeze(weapons[key]);
    }
    assets = Object.freeze({ canvas, mask, parts: Object.freeze(parts), weapons: Object.freeze(weapons),
      scale: SS, width: ATLAS_W, height, bytes: ATLAS_W * height * SS * SS * 8,
      bounds: Object.freeze({ left: -15.5, right: 14.5, top: -29.5, bottom: 24, width: 30, height: 53.5 }),
      limits: Object.freeze({ canvases: 2, bytes: 8 * 1024 * 1024, ghostParts: 24 })
    });
    return assets;
  }

  function pose(p = {}, time = 0, options = {}) {
    const aim = finite(p.aim), sin = Math.sin(aim), cos = Math.cos(aim);
    const index = ((Math.round(Math.atan2(sin, cos) / (Math.PI / 4)) % 8) + 8) % 8;
    const frame = [0, 1, 2, 1, 0, 3, 4, 3][index];
    const mirror = index >= 3 && index <= 5;
    const vx = finite(p.vx), vy = finite(p.vy), speed = Math.hypot(vx, vy);
    const motion = !options.reduceMotion;
    const moving = speed > 20, dash = clamp(p.dashT, 0, 0.2) > 0;
    const t = finite(time), phase = finite(p.walkPhase);
    const stride = motion && moving && !dash ? Math.sin(phase) * 1.85 : 0;
    const recoil = motion ? clamp(p.recoil, 0, 2.5) * 0.8 : 0;
    const inertia = motion ? clamp(vx / 300, -1, 1) : 0;
    // Being hit rocks the whole figure away from the attacker; it decays like the flash.
    const kick = motion ? clamp(p.hurtKick, 0, 1) : 0;
    const kx = clamp(p.hurtDirX, -1, 1), ky = clamp(p.hurtDirY, -1, 1);
    const lowHp = Number.isFinite(p.hp) && Number.isFinite(p.maxHp) && p.maxHp > 0 && (p.hp / p.maxHp < 0.28);
    const breath = motion ? Math.sin(t * (lowHp ? 3.8 : 2.1)) * (moving ? 0.08 : (lowHp ? 0.3 : 0.22)) : 0;
    const stance = motion ? (dash ? -0.18 : clamp(vx / 300, -1, 1) * 0.085 + (moving ? Math.sin(phase) * 0.018 : 0)) : 0;
    const crouch = motion && dash ? 1.25 : 0;
    const brace = motion ? clamp(recoil, 0, 2.5) * 0.16 + Math.abs(stance) * 0.35 : 0;
    const dashLean = dash ? -0.26 : 0;
    // Walk cycle detail: the hips lead, the shoulders counter, the knee of the forward
    // leg bends and the boot rolls from heel to toe. Four small numbers, four readable cues.
    const swing = motion && moving && !dash ? Math.sin(phase) : 0;
    return {
      facing: directions[index], frame: views[frame], mirror, aim, rearGun: sin < -0.25,
      weapon: Object.prototype.hasOwnProperty.call(weaponOutlines, p.weapon) ? p.weapon : 'pistol',
      evolved: !!p.evolved,
      bob: motion ? (moving ? -Math.abs(Math.sin(phase)) * 0.85 : Math.sin(t * 2.1) * 0.22) : 0,
      breath,
      stance,
      crouch,
      brace,
      stepLeft: stride, stepRight: stride ? -stride : 0,
      hipSway: motion ? -swing * 0.5 : 0,
      twist: motion ? swing * 0.55 : 0,
      armSwing: motion ? -swing * 0.08 : 0,
      kneeLeft: motion ? Math.max(0, stride) * 0.55 : 0,
      kneeRight: motion ? Math.max(0, -stride) * 0.55 : 0,
      footLeft: motion ? -stride * 0.075 : 0,
      footRight: motion ? stride * 0.075 : 0,
      // Recoil pushes the torso back along the aim line and lifts the shoulders slightly.
      lean: motion ? inertia * 0.045 - cos * recoil * 0.034 + (dash ? clamp(p.dashDirX, -1, 1) * 0.13 + dashLean : 0)
        + kick * (kx * 0.12 + ky * 0.04) : 0,
      // Wounded: the hunter crouches a little and hunches, so low health is visible in the
      // body, not only in the health bar. Only active when hp/maxHp are known, so a bare
      // pose() call with no stats stays identical to before.
      drop: motion ? -(kick * (ky < 0 ? 1.6 : -1.1))
        + (Number.isFinite(p.hp) && Number.isFinite(p.maxHp) && p.maxHp > 0
          ? clamp(1 - p.hp / p.maxHp, 0, 1) * 1.9 : 0) : 0,
      shove: motion ? kick * kx * 1.5 : 0,
      cloak: motion ? -inertia * 0.09 + Math.sin(t * 3.1 + phase * 0.3) * 0.018 + (dash ? -0.32 : 0) - kick * kx * 0.1 : 0,
      scarf: motion ? Math.sin(t * 3.7 + 0.7) * 0.035 - inertia * 0.08 + (dash ? -0.26 : 0) : 0,
      lantern: motion ? Math.sin(t * 2.4 + phase * 0.35) * 0.025 - inertia * 0.055 - kick * kx * 0.16 + (dash ? -0.22 : 0) : 0,
      wrist: motion && recoil ? -recoil * 0.055 : 0, recoil,
      dash: motion && dash,
      muzzle: motion ? clamp(p.muzzle / 0.12, 0, 1) : 0,
      hurt: clamp(p.hurtFlash, 0, 1)
    };
  }
  function capture(p, time, options) { return Object.freeze(pose(p, time, options)); }

  // Gameplay effects use these world-space points instead of duplicating draw offsets.
  // Lantern glass is local (0,4) under its (-10,10) joint; muzzle is local (24,0).
  function anchors(p = {}, time = 0, options = {}) {
    requireInit();
    const q = pose(p, time, options);
    const x = finite(p.x), y = finite(p.y);
    const bodyCos = Math.cos(q.lean), bodySin = Math.sin(q.lean);
    const mirror = q.mirror ? -1 : 1;
    const local = (lx, ly) => {
      const mx = lx * mirror;
      return { x: x + bodyCos * mx - bodySin * ly, y: y + bodySin * mx + bodyCos * ly + q.bob + q.drop };
    };
    const lanternLocal = local(-10 - Math.sin(q.lantern) * 4, 10 + Math.cos(q.lantern) * 4 + q.breath);
    const aim = finite(q.aim), gunX = 24 - q.recoil;
    // The weapon is drawn outside the torso's shove/bob (the arm absorbs the hit), so the
    // muzzle anchor must stay on that same steady line or the flash would drift off the barrel.
    const muzzle = Object.freeze({ x: x + Math.cos(aim) * gunX, y: y + Math.sin(aim) * gunX });
    return Object.freeze({
      lantern: Object.freeze(lanternLocal), muzzle,
      muzzleAlpha: options.reduceMotion ? 0 : q.muzzle
    });
  }

  function part(ctx, name, source) {
    const r = assets.parts[name];
    ctx.drawImage(source, r.x * SS, r.y * SS, r.w * SS, r.h * SS, r.dx, r.dy, r.w, r.h);
  }
  function joint(ctx, name, source, x = 0, y = 0, angle = 0, mirror = false) {
    ctx.save(); ctx.translate(x, y); if (angle) ctx.rotate(angle); if (mirror) ctx.scale(-1, 1);
    part(ctx, name, source); ctx.restore();
  }
  function bodySpace(ctx, pose, fn) {
    ctx.save(); ctx.translate(finite(pose.shove), pose.bob + finite(pose.drop)); ctx.rotate(pose.lean);
    if (pose.mirror) ctx.scale(-1, 1); fn(); ctx.restore();
  }
  function gun(ctx, q, source) {
    const w = assets.weapons[q.weapon][q.evolved ? 'evolved' : 'base'];
    ctx.save(); ctx.rotate(q.aim); // Never rotate the gun by body lean/wrist: exact gameplay aim.
    // Recoil compresses the arm and slides the weapon along its own axis, not off the aim line.
    joint(ctx, 'upper-arm', source, 1, q.brace * 0.35, q.wrist + q.stance * 0.35);
    joint(ctx, 'forearm', source, -q.recoil, q.brace, q.wrist * 0.25 + q.stance * 0.25);
    joint(ctx, w.part, source, -q.recoil, 0);
    // The support hand grips the barrel BEFORE the trigger hand is drawn, so the near hand
    // overlaps the far one instead of the two reading as one wide blob.
    if (w.twoHanded) joint(ctx, 'support-glove', source, 17 - q.recoil, 1.5, -0.12);
    joint(ctx, 'glove', source, w.twoHanded ? 8 - q.recoil : 12 - q.recoil, 1, q.wrist);
    // A short shadow under the weapon seats it in the hand.
    ctx.save(); ctx.globalAlpha *= 0.22;
    line(ctx, '#050d13', w.twoHanded ? 1.8 : 1.3,
      w.twoHanded ? `M6 3.4 L18 3.6` : `M11 3.6 L22 3.8`);
    ctx.restore();
    ctx.restore();
  }
  function figure(ctx, q, source) {
    bodySpace(ctx, q, () => {
      joint(ctx, 'cape', source, q.hipSway, q.crouch * 1.4, q.cloak);
      // Coat skirt first, then the legs in front of it: a split coat with the thighs
      // reading through the opening, which is what gives the figure a lower body at 1x.
      joint(ctx, 'hem-left', source, q.hipSway * 0.6, 0, q.cloak * 0.65 + q.stepLeft * 0.018);
      joint(ctx, 'hem-right', source, q.hipSway * 0.6, 0, -q.cloak * 0.35 + q.stepRight * 0.018);
      // Thighs and shin boots move as hinged pairs.
      // Each leg gets hip swing, knee bend and an ankle roll, so the stride has a joint
      // rather than a sliding tube.
      for (const [x, step, knee, roll] of [[-5, q.stepLeft, q.kneeLeft, q.footLeft],
        [5, q.stepRight, q.kneeRight, q.footRight]]) {
        const crouchY = q.crouch * 1.8;
        const lift = knee * 0.9;
        const hx = x + q.hipSway;
        joint(ctx, 'leg', source, hx, 7 + step * 0.45 + crouchY - lift * 0.35, step * 0.075 - q.crouch * 0.12);
        joint(ctx, 'knee-guard', source, hx, 11 + step * 0.45 + crouchY - lift * 0.35, step * 0.075 - q.crouch * 0.12, x < 0);
        joint(ctx, 'boot', source, hx + roll * 3.2, 14 + step + crouchY - lift, roll - q.crouch * 0.18, x < 0);
        joint(ctx, 'heel', source, hx + roll * 3.2, 20 + step + crouchY - lift, roll - q.crouch * 0.18, x < 0);
      }
    });
    if (q.rearGun) gun(ctx, q, source);
    bodySpace(ctx, q, () => {
      // Shoulders counter-rotate against the hips, which is what makes a walk read as a walk.
      joint(ctx, 'torso-' + q.frame, source, q.twist, q.breath, q.stance * 0.3);
      joint(ctx, 'coat-pin', source, q.twist, q.breath - 2, q.stance * 0.3);
      joint(ctx, 'vial', source, 4.8 + q.twist * 0.4, 5.5 + q.breath, q.stance * 0.2 + q.cloak * 0.2);
      joint(ctx, 'gear-pouch', source, -5.2 + q.twist * 0.4, 5 + q.breath, -q.stance * 0.15 + q.cloak * 0.15);
      joint(ctx, 'idle-arm', source, -9 + q.twist * 0.4, -4 + q.breath, q.lantern * 0.65 + q.armSwing);
      joint(ctx, 'lantern', source, -10, 10 + q.breath, q.lantern);
      // Asymmetric cape lies on the left shoulder, not as a round blanket over the chest.
      joint(ctx, 'cape', source, q.twist * 0.3, 0, q.cloak * 0.75);
      joint(ctx, 'scarf-tail', source, 3 + q.twist * 0.3, -9 + q.breath, q.scarf);
      part(ctx, 'scarf', source);
    });
    if (!q.rearGun) gun(ctx, q, source);
    // Face always reads clearly above a passing arm. Hat brim remains above the eyes.
    bodySpace(ctx, q, () => {
      // Head drawn at 0.88 and anchored at the neck: the skull and hat shrink toward
      // adult proportion while the collar and shoulders stay exactly where they were.
      ctx.save();
      ctx.translate(-q.twist * 0.45, q.breath); ctx.rotate(q.stance * 0.15);
      ctx.translate(0, -10); ctx.scale(HEAD_SCALE, HEAD_SCALE); ctx.translate(0, 10);
      part(ctx, 'head-' + q.frame, source);
      ctx.restore();
      joint(ctx, 'hat-feather', source, 4.4 - q.twist * 0.45, -20.6 + q.breath, q.stance * 0.2 + q.cloak * 0.15);
    });
  }
  function requireInit() { if (!assets) throw new Error('Character.init() must be called before drawing'); }
  function draw(ctx, p, time, options = {}) {
    requireInit(); if (!p || p.dead) return;
    const q = pose(p, time, options);
    ctx.save();
    try {
      ctx.translate(finite(p.x), finite(p.y));
      ctx.imageSmoothingEnabled = true;
      // Night rim: the same alpha mask, shifted a hair and added behind the figure, leaves a
      // cool crescent along the silhouette. It is what keeps the hunter readable in near-dark
      // without brightening his coat or blowing out the lantern.
      if (options.rim && !options.low) {
        const prev = ctx.globalCompositeOperation, alpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * 0.24;
        ctx.save(); ctx.translate(-1.1, -1.25); figure(ctx, q, assets.mask); ctx.restore();
        ctx.globalCompositeOperation = prev; ctx.globalAlpha = alpha;
      }
      if (options.highContrast) {
        const alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * 0.32;
        ctx.save(); ctx.translate(-0.6, 0); figure(ctx, q, assets.mask); ctx.restore();
        ctx.save(); ctx.translate(0.6, 0); figure(ctx, q, assets.mask); ctx.restore();
        ctx.globalAlpha = alpha;
      }
      figure(ctx, q, assets.canvas);
      if (q.hurt > 0) {
        // A brief flash over the exact silhouette. Kept additive and shallow so the hit reads
        // as a jolt of light without erasing the face, coat and weapon the player just saw.
        const alpha = ctx.globalAlpha, prevOp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * q.hurt * 0.16;
        figure(ctx, q, assets.mask);
        ctx.globalCompositeOperation = prevOp; ctx.globalAlpha = alpha;
      }
      if (q.muzzle > 0 && !options.low) {
        ctx.save(); ctx.rotate(q.aim); ctx.translate(24 - q.recoil, 0);
        ctx.globalAlpha *= q.muzzle; ctx.globalCompositeOperation = 'lighter';
        part(ctx, 'muzzle-flash', assets.canvas); ctx.restore();
      }
    } finally { ctx.restore(); }
  }
  function drawGhost(ctx, afterimage, p, options = {}) {
    requireInit();
    if (!afterimage || options.reduceMotion || finite(afterimage.life) <= 0) return;
    const life = clamp(finite(afterimage.life) / Math.max(0.001, finite(afterimage.max, 0.3)), 0, 1);
    // Parent can preserve exact articulation at dash spawn. Legacy {x,y,a,life,max} is supported.
    const q = afterimage.pose || pose({ ...p, aim: finite(afterimage.a, finite(p && p.aim)), muzzle: 0, hurtFlash: 0 }, 0, options);
    ctx.save();
    try {
      ctx.translate(finite(afterimage.x), finite(afterimage.y));
      ctx.globalAlpha = Math.min(0.35, ctx.globalAlpha * life * 0.35);
      ctx.imageSmoothingEnabled = true;
      figure(ctx, q, assets.mask);
    } finally { ctx.restore(); }
  }
  return Object.freeze({ init, pose, capture, anchors, draw, drawGhost, get assets() { return assets; } });
})();
