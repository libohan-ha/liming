/* Long Night · hand-painted rain hunter. Classic script; no dependencies or network.
 * Art.init must call Character.init once before drawing. Units are world pixels.
 * Origin is the torso/collision centre, not the feet. Gun local muzzle is (24, 0).
 * Only init builds paths/gradients. Animation composites articulated cached parts.
 */
window.Character = (function () {
  'use strict';
  const SS = 3, ATLAS_W = 256, PAD = 2;
  const INK = '#101920', BRASS = '#bc9758', MOON = '#a9c4d0';
  const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, finite(v)));
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
    c.fillStyle = '#30251b'; c.fillRect(x, y, w, h);
    c.strokeStyle = BRASS; c.lineWidth = 0.5; c.strokeRect(x, y, w, h);
    line(c, '#e6c88e', 0.36, `M${x + w * 0.5} ${y} L${x + w * 0.5} ${y + h}`);
  }

  function torso(c, view) {
    const front = view !== 'back' && view !== 'rearquarter';
    const narrow = view === 'side';
    c.save(); if (narrow) c.scale(0.79, 1);
    // Tailored shoulders and waist: no ellipse, separate wool panels and lapels.
    paint(c, grad(c, -9, -9, 9, 9, ['#718b99', '#3e5868', '#233544']),
      'M-4 -10 C-7 -10 -11 -8 -12 -4 L-9 0 C-8 3 -7 5 -8 8 C-3 10 4 10 8 8 C7 4 8 1 10 -2 L11 -5 C9 -8 6 -10 4 -10 Z');
    paint(c, '#526d7d', 'M-9 -6 C-7 -7 -6 -7 -4 -6 L-2 4 L-7 7 C-7 2 -8 -1 -9 -6 Z', null);
    paint(c, '#2b404f', 'M4 -8 C7 -8 9 -5 9 -2 L6 1 L5 8 L0 9 L1 -3 Z', null);
    line(c, '#859dab', 0.55, 'M-9 -5 C-8 -7 -7 -7 -5 -8 M-7 3 L-7 6 M6 -7 C8 -6 8 -4 9 -3');
    if (front) {
      // Collar rises around the neck but never masks the cheeks.
      paint(c, '#172932', 'M-5 -11 L-7 -8 L-3 -2 L0 -6 L3 -2 L7 -8 L5 -11 Z');
      paint(c, '#6d8594', 'M-5 -10 L-5 -7 L-2 -4 L-1 -6 Z', null);
      paint(c, '#415b6a', 'M4 -10 L5 -7 L2 -4 L1 -6 Z', null);
      paint(c, '#263b4a', 'M-2 -5 L1 -6 L3 7 L-1 8 Z', null);
      for (let y = -2; y < 7; y += 2.5) {
        c.fillStyle = BRASS; c.fillRect(0.2, y, 0.8, 0.65);
        c.fillStyle = '#f0d5a0'; c.fillRect(0.25, y, 0.35, 0.2);
      }
      // Diagonal leather baldric, piping and a real brass clasp.
      paint(c, '#4b3529', 'M-7 -8 L-5 -9 L7 7 L4 8 Z', '#1c2427', 0.6);
      line(c, '#99764e', 0.5, 'M-5.8 -8 L5.4 7'); buckle(c, -1.3, -0.6, 2.5, 2.5);
      paint(c, '#3e2e27', 'M-8 5 C-3 6 3 6 8 5 L8 7 C3 8 -3 8 -8 7 Z', INK, 0.55);
      buckle(c, 1.3, 5.5);
      line(c, '#1b303e', 0.55, 'M-6 2 L-3 2 M5 2 L7 1');
      line(c, '#8698a2', 0.4, 'M-6 1.7 L-3 1.7');
      // Compact cartridge pouch, not a sci-fi rectangular breastplate.
      paint(c, '#584034', 'M-8 4 C-6 3 -4 4 -4 5 L-4 8 C-5 9 -7 9 -8 8 Z');
      line(c, '#a18159', 0.45, 'M-7 4.5 L-5 4.5 M-6.5 6 L-6.5 7.6');
    } else {
      // Rear yoke, centre seam, belt and weathered shoulder stitching.
      paint(c, '#526b7c', 'M-10 -6 C-5 -9 5 -9 10 -6 L8 -2 C2 -4 -3 -4 -9 -2 Z', null);
      line(c, '#91a7b1', 0.55, 'M-9 -5 C-4 -7 4 -7 9 -5');
      line(c, '#152936', 0.6, 'M0 -4 C-1 0 1 4 0 8');
      line(c, '#667f8d', 0.4, 'M0.8 -3 L0.8 6');
      paint(c, '#3b2c26', 'M-8 5 C-4 6 4 6 8 5 L8 7 C2 8 -2 8 -8 7 Z');
      buckle(c, -3, 5.5, 2.3, 1.8);
      paint(c, '#463830', 'M-5 -9 L-3 -10 L7 6 L5 7 Z', INK, 0.5);
      line(c, '#977956', 0.4, 'M-3.6 -8 L5.8 6');
    }
    // Short irregular brush strokes suggest wet cloth rather than noise.
    line(c, '#738b98', 0.35, 'M-5 0 L-4.4 1.2 M-6.8 4 L-6.2 5 M5.8 -4 L6.3 -2.5 M4 3 L4.3 4.3');
    c.restore();
  }

  function head(c, view) {
    const profile = view === 'side', quarter = view === 'quarter';
    const rear = view === 'back' || view === 'rearquarter';
    // Neck, ear helix and hair tucked behind the ear.
    paint(c, '#ae9783', 'M-2 -15 L-2 -10 C0 -9 3 -10 4 -11 L3 -16 Z', INK, 0.6);
    paint(c, '#28303a', 'M-6 -23 C-9 -22 -8 -17 -6 -14 L-3 -13 L0 -17 L5 -16 L7 -22 Z');
    if (!rear) {
      paint(c, '#c9b8a2', 'M-5 -21 C-6 -23 -8 -21 -7 -19 C-7 -17 -5 -17 -4 -18 Z', INK, 0.55);
      line(c, '#8a7568', 0.4, 'M-6 -20 C-7 -21 -7 -18 -5 -19');
      if (!profile) {
        paint(c, '#beaa93', 'M5 -21 C7 -23 8 -20 7 -18 L5 -17 Z', INK, 0.5);
        line(c, '#887364', 0.4, 'M6 -20 L6.5 -18.5');
      }
      const face = profile ? 'M-3 -24 C1 -25 5 -24 6 -22 L6 -20 L8 -18.5 L6 -18 L6 -15.5 C4 -13 1 -12 -2 -14 C-4 -16 -4 -20 -3 -24 Z'
        : quarter ? 'M-4 -24 C-1 -25 4 -24 5 -22 L5.5 -20 L7 -18.5 L5 -18 L5 -15.5 C3 -12 -1 -12 -3 -14 C-5 -16 -5 -21 -4 -24 Z'
          : 'M-5 -24 C-3 -25 3 -25 5 -23 L5 -18 C5 -15 3 -12.5 0 -12.5 C-3 -13 -5 -15 -5 -18 Z';
      paint(c, grad(c, -4, -23, 6, -15, ['#ede0c7', '#d8c9b2', '#a48d7c']), face, INK, 0.6);
      if (!profile) paint(c, '#eedfc6', 'M-3 -22 C-1 -23 0 -22 0 -20 L-1 -17 L-3 -16 C-4 -18 -4 -20 -3 -22 Z', null);
      paint(c, '#af9884', profile ? 'M2 -18 L5 -18 L5 -15 L2 -14 Z' : 'M1 -18 L4 -18 L3 -15 L1 -14 Z', null);
      const eyeX = profile ? 3.1 : quarter ? 2.4 : 2;
      // Eyes sit fully below the brim. No black band across the face.
      line(c, '#655248', 0.55, `M${eyeX - 1.2} -21 C${eyeX - 0.4} -21.5 ${eyeX + 0.4} -21.5 ${eyeX + 1.2} -21`);
      line(c, '#eee9d8', 0.8, `M${eyeX - 0.8} -20.3 L${eyeX + 0.8} -20.3`);
      line(c, '#283942', 0.65, `M${eyeX} -20.5 L${eyeX} -19.9`);
      if (!profile) {
        const x = quarter ? -2.3 : -2;
        line(c, '#675447', 0.5, `M${x - 1} -21 L${x + 0.9} -21.2`);
        line(c, '#ede8d8', 0.8, `M${x - 0.6} -20.3 L${x + 0.7} -20.3`);
        line(c, '#263842', 0.65, `M${x} -20.5 L${x} -20`);
      }
      line(c, '#937768', 0.45, profile ? 'M5 -20 L5 -18.5 L6 -18.3' : quarter ? 'M1 -20 L2 -18 L3 -18' : 'M0 -20 L-0.5 -18 L0.9 -18');
      line(c, '#705d54', 0.5, profile ? 'M2.8 -15.7 L5 -15.7' : 'M-1.6 -15.8 C-0.5 -15.5 1 -15.5 2 -15.8');
      line(c, '#f0dbc0', 0.35, 'M-1 -14.4 L1 -14.2');
      // A fine scar and stubble kept subordinate to the light planes of the face.
      line(c, '#ab8c78', 0.3, 'M-3 -18.7 L-2.3 -17.3 M1 -14.3 L1.3 -13.7 M2.3 -14.6 L2.5 -14');
    } else {
      paint(c, '#303743', 'M-5 -24 C-8 -21 -7 -17 -5 -15 L-3 -13 L0 -15 L3 -13 L6 -16 C7 -19 6 -23 5 -24 Z');
      line(c, '#616b71', 0.6, 'M-5 -21 C-6 -18 -5 -16 -4 -15 M-2 -20 L-2 -16 M2 -19 L3 -16');
      if (view === 'rearquarter') {
        paint(c, '#c4ad96', 'M5 -21 C7 -22 8 -20 7 -18 L5 -17 Z', INK, 0.5);
        line(c, '#866e60', 0.4, 'M6 -20 L6 -18.5');
      }
    }
    // A small cocked tricorn: crown -29, brim -24; face -23..-13 stays exposed.
    paint(c, grad(c, -6, -29, 5, -23, ['#65727b', '#333e48', '#1a2732']),
      'M-6 -25 C-6 -27 -4 -28 -2 -28 L0 -29 L4 -28 C5 -26 6 -25 7 -24 L-6 -24 Z', INK, 0.8);
    paint(c, '#384753', 'M-6 -26 L-3 -27 L-1 -28 L0 -26 L5 -25 L4 -24 L-6 -24 Z', null);
    line(c, '#8797a0', 0.45, 'M-4 -27 L-2 -27.4 M1 -28 L3 -27.5');
    paint(c, '#222d37', 'M-9 -25 C-5 -23 -4 -25 -1 -25 C2 -25 4 -22.9 8 -25 L9 -24 C6 -22.7 2 -23 0 -23.4 C-4 -23.2 -7 -22.8 -10 -24 Z', INK, 0.7);
    line(c, '#92a5ae', 0.6, 'M-9 -24.8 C-6 -23.5 -4 -24.3 -2 -24.4 M3 -24.1 L7.5 -24.7');
    line(c, '#b39d68', 0.7, 'M-4 -25.2 C0 -25.8 2 -25.5 4 -25');
    buckle(c, 2.8, -26.2, 1.6, 1.3);
  }

  function hem(c, side) {
    c.save(); c.scale(side, 1);
    paint(c, grad(c, -8, 7, 1, 19, ['#526b7b', '#314959', '#1d303d']),
      'M-8 6 C-5 7 -2 7 0 7 L-1 13 C-2 16 -1 18 -2 19 C-4 18 -6 20 -10 18 L-11 16 C-8 13 -8 9 -8 6 Z');
    paint(c, '#465d6e', 'M-7 8 L-3 8 C-5 12 -3 15 -4 18 L-8 17 C-7 13 -8 11 -7 8 Z', null);
    line(c, '#8c9eaa', 0.5, 'M-8 8 C-8 12 -9 15 -10 16 M-9 18 L-6 18.3');
    line(c, '#1a2f3c', 0.6, 'M-2 9 C-4 13 -3 16 -2.5 18');
    line(c, '#748a98', 0.3, 'M-5 12 L-5.4 14 M-8 15 L-8.4 16.3');
    c.restore();
  }
  function leg(c) {
    paint(c, grad(c, -3, 0, 3, 9, ['#687786', '#35424f', '#222c36']),
      'M-3 0 C-1 -1 2 -1 3 0 L2.7 5 L3 9 C1 10 -2 10 -3 9 L-2.5 5 Z');
    paint(c, '#4e5b68', 'M-2 1 L0 0 L0.5 4 L-1.5 7 L-2 9 Z', null);
    line(c, '#141f2a', 0.6, 'M-2.5 5 C-1 4 1 4 2.5 5');
    line(c, '#9aa3aa', 0.45, 'M-2 5.6 L1.5 5.6');
    line(c, '#222d37', 0.45, 'M1.6 1 L1.8 4 M-0.4 7 L0 8');
  }
  function boot(c) {
    paint(c, grad(c, -3, 0, 3, 9, ['#5a4940', '#2e3033', '#141e27']),
      'M-2.9 0 C-1 0 1 0 2.8 0 L2.4 4 C3.2 5 5 5.5 5.5 7 C5.8 8 4.5 9 1 9 L-3 9 C-4 7 -3.5 5 -3 4 Z', INK, 0.75);
    paint(c, '#17212a', 'M-3.8 7 C-1 8 3 8 5.5 7 L5.5 9 C2 10 -1 10 -3.7 9 Z', INK, 0.55);
    line(c, '#8a8b86', 0.6, 'M-3.5 8.4 C-1 9 2 9 5.2 8.2');
    paint(c, '#475158', 'M-2 1 L-0.8 1 L-0.9 5 L-2.5 6 Z', null);
    line(c, '#a78e69', 0.4, 'M-1.5 1.5 L1 2.3 M1 1.5 L-1.4 2.3 M-1.5 3 L1 3.8 M1 3 L-1.5 3.8 M-1.4 4.5 L0.9 5.1');
    line(c, '#76818a', 0.45, 'M1 6 C2.5 5.8 4 6.5 4.5 7');
    buckle(c, 1.2, 0.7, 1.3, 1.1);
  }
  function cape(c) {
    paint(c, grad(c, -13, -10, 1, 10, ['#697f91', '#354755', '#1b2936']),
      'M-4 -11 C-9 -12 -13 -9 -13 -6 C-13 -3 -15 1 -15 4 L-12 3 L-13 7 C-10 6 -8 8 -5 6 C-4 3 -1 1 0 -3 L0 -8 Z', INK, 0.85);
    paint(c, '#516778', 'M-6 -9 C-10 -8 -10 -4 -11 0 L-9 2 L-7 0 C-5 -3 -3 -4 -2 -7 Z', null);
    line(c, '#9dabb5', 0.65, 'M-12 -7 C-11 -9 -8 -10 -5 -10');
    line(c, '#22323f', 0.7, 'M-9 -5 C-10 -1 -11 2 -12 4 M-5 -7 C-5 -3 -7 2 -7 5');
    line(c, '#788b99', 0.35, 'M-11 1 L-11.8 3 M-9.7 5 L-8.5 5.4');
    paint(c, '#8a6b43', 'M-4 -9 C-3 -10 -1 -10 0 -9 L0 -7 C-1 -6 -3 -7 -4 -8 Z', INK, 0.5);
    line(c, '#e7c486', 0.5, 'M-2.8 -8.7 L-1.2 -8.7');
  }
  function scarf(c) {
    paint(c, grad(c, -5, -11, 5, -7, ['#f1cf8b', '#c89b53', '#8e6537']),
      'M-5 -12 C-2 -10 3 -10 5 -12 L6 -9 C3 -7 -2 -7 -5 -9 Z', INK, 0.6);
    line(c, '#f5d799', 0.65, 'M-4 -10.7 C-1 -9.2 2 -9.2 4.5 -10.8');
    line(c, '#967140', 0.5, 'M-3 -8.8 C0 -8.1 2 -8.5 4 -9.2');
  }
  function scarfTail(c) {
    paint(c, grad(c, 0, 0, 5, 11, ['#dbb875', '#b58849', '#735036']),
      'M0 0 L3 -0.5 C3 2 2 3 3 5 C4 7 6 8 5 11 L1 11.5 C2 8 0 6 0 4 Z', INK, 0.55);
    line(c, '#f2cd86', 0.45, 'M1.4 1 C1 4 3.7 8 3 10');
    line(c, '#634933', 0.3, 'M1.5 10 L1.1 12 M2.7 10.4 L2.3 12 M4 10.2 L3.8 11.8');
  }
  function lantern(c) {
    // The brass cage and warm glass are baked; glow never becomes a frame gradient.
    line(c, '#bea572', 0.85, 'M-2 -1 C-4 -5 4 -5 2 -1');
    paint(c, '#544536', 'M-3 0 L-1 -1.5 L1 -1.5 L3 0 L3.5 1 L-3.5 1 Z', INK, 0.55);
    paint(c, grad(c, -2, 1, 2, 7, ['#fff0b0', '#f5c267', '#c57f36']),
      'M-2.5 1 L2.5 1 L3 7 C1 8 -1 8 -3 7 Z', '#5a4330', 0.5);
    paint(c, '#fff6ca', 'M-0.6 6 C-2 4 0 4 0.5 2 C0.2 4 2 5 0.5 6 Z', null);
    for (const x of [-2.7, 0, 2.7]) line(c, '#9a7847', 0.55, `M${x} 1 L${x} 7`);
    paint(c, '#8d7049', 'M-3.3 7 L3.3 7 L3.5 8.5 C1 9.2 -1 9.2 -3.5 8.5 Z', INK, 0.6);
    line(c, '#f8d999', 0.45, 'M-2.4 0.4 L2.1 0.4 M-2.6 8 L2.4 8');
    line(c, '#fff4ca', 0.5, 'M-1.4 2 L-1.5 5');
  }
  function sleeve(c, fore) {
    paint(c, grad(c, 0, -2, 10, 4, ['#7b909e', '#425d6e', '#293c4a']), fore
      ? 'M6 1 C8 0 11 -0.5 14 0 L14 3 C11 4 8 5 6 4 Z'
      : 'M0 -2 C3 -2 5 -1 8 1 L8 4 C5 6 2 4 0 3 Z');
    line(c, MOON, 0.45, fore ? 'M7 1.2 L12 0.9' : 'M1 -1 L4 -0.4');
    if (fore) {
      paint(c, '#263845', 'M11 -0.1 L13.8 0 L13.5 3.5 L11.5 3.8 Z');
      line(c, '#a69c82', 0.45, 'M12 0.3 L12.4 3.1');
    } else line(c, '#20313f', 0.6, 'M5 0 L4 2 L6 4');
  }
  function glove(c, support) {
    paint(c, grad(c, -1, -1, 3, 4, ['#806451', '#453b34', '#252e31']), support
      ? 'M-2 0 C-1 -1 1 -1 3 0 L3.5 2 C2 3 0 3.5 -2 2 Z'
      : 'M-1 0 C0 -1 2 -1 3.5 0 L4 2 L3 3 L2 5 C0 5 -1 3 -1 2 Z', INK, 0.6);
    line(c, '#b89b72', 0.4, 'M0 0 L1 0.5 M1.7 0 L2.6 0.7');
    line(c, '#222627', 0.45, 'M0 2 L2.8 2');
  }
  function idleArm(c) {
    paint(c, grad(c, -3, 0, 2, 13, ['#5e798b', '#354e60', '#233441']),
      'M-2 0 C0 -1 2 0 2 3 L1 7 L0 11 L-3 11 L-3.7 7 C-4 3 -3 1 -2 0 Z');
    line(c, '#8097a7', 0.6, 'M-2.5 2 L-3 5 M-2.7 7 L-2.2 9');
    paint(c, '#4c3d34', 'M-3 10 L0 10 L1 12 C1 14 -1 14 -2 13 L-3 12 Z');
    line(c, '#aa8c67', 0.4, 'M-1.6 11 L-1.1 12.5');
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
    const steel = grad(c, 0, -4, 0, 4, ['#bfd0d5', '#6b7f88', '#273a46']);
    paint(c, steel, outline, '#111c24', 0.75);
    if (key === 'pistol') {
      paint(c, '#71503a', evolved ? 'M9 1 L13 3 L11 8 L7 6 Z' : 'M11 1 L14 3 L11 7 L8 5.5 Z', '#392e27', 0.45);
      line(c, '#c39864', 0.5, 'M11 3 C10 4 10 5 9 5.5');
      paint(c, evolved ? '#987641' : '#536571', 'M12 -2.5 C13 -4 17 -3 18 -2 L18 0.7 C16 2 13 1 12 0 Z', INK, 0.5);
      line(c, '#c3d0d1', 0.45, 'M13 -2.1 L17 -2 M14 -1.4 L14 0 M16 -1.4 L16 0');
      line(c, BRASS, 0.7, 'M14 2 C14 5 17 5 17 2');
      line(c, '#e9d9b1', 0.4, 'M19 -2 L23 -2');
      if (evolved) {
        paint(c, '#ddbf74', 'M12 -4 L13 -6 L15 -4 Z', INK, 0.45);
        line(c, '#f3d99c', 0.5, 'M18 -3.1 C18.5 -1 20 -2 20.5 -0.5');
        paint(c, '#7096a5', 'M8 0 L10 -1 L11 1 L9 2 Z', '#edcf86', 0.4);
      }
    } else if (key === 'shotgun') {
      paint(c, grad(c, 0, 1, 4, 6, ['#93734d', '#63472f', '#3d312b']),
        evolved ? 'M-1 1 C2 1 4 2 7 1 L9 3 L3 7 L-1 4 L2 2 Z' : 'M0 1 L7 1 L8 3 L4 6 L0 4 L3 2 Z', INK, 0.5);
      paint(c, '#7f5c38', 'M11 1 L19 1 L19 3 L11 3 Z', INK, 0.45);
      line(c, '#be9a60', 0.5, 'M12 1.5 L18 1.5 M13 2 L13 2.6 M15 2 L15 2.6 M17 2 L17 2.6');
      line(c, '#182a35', 0.55, 'M10 -0.6 L24 -0.6');
      line(c, '#d4e0df', 0.5, 'M11 -2.3 L23 -2.3');
      line(c, '#b59459', 0.7, 'M7 3 C6 6 10 6 10 3');
      if (evolved) {
        paint(c, '#c8a466', 'M9 -4 L11 -4 L11 3 L9 3 Z', INK, 0.4);
        paint(c, '#c5a163', 'M20 -4 L22 -4 L22 3 L20 3 Z', INK, 0.4);
        line(c, '#eee0b4', 0.4, 'M14 -3 L17 -3 M14 -2.2 L17 -2.2');
        paint(c, '#aa7645', 'M-1 3 L1 3 L2 5 L1 6 Z', INK, 0.4);
      }
    } else {
      paint(c, '#684932', 'M2 1 L7 1 L8 3 L4 5 L1 3 Z', INK, 0.45);
      paint(c, '#3a4d56', evolved ? 'M10 2 L16 3 L17 8 L12 9 Z' : 'M11 2 L15 2 L15 6.5 L12 7 Z', INK, 0.5);
      line(c, '#9caeae', 0.45, 'M12 3 L13 6 M13.5 3 L14.5 6');
      paint(c, '#a28450', 'M8 -1 L14 -1 L14 1.3 L8 1.3 Z', INK, 0.4);
      line(c, '#e0c58c', 0.4, 'M9 -0.4 L12 -0.4');
      line(c, '#d3e0df', 0.5, 'M16 -1.5 L23 -1.5');
      line(c, '#172733', 0.65, 'M18 0 L23 0');
      line(c, '#ad8e57', 0.65, 'M8 3 C7 5 10 5 10 3');
      if (evolved) {
        paint(c, '#486b7d', 'M12 -4 L13 -6 L16 -6 L17 -3 Z', INK, 0.5);
        line(c, '#c0e3e5', 0.5, 'M13 -5 L15.5 -5');
        paint(c, '#c09a58', 'M17 -3 L19 -3 L19 1.5 L17 1.5 Z', INK, 0.4);
        line(c, '#ebcf8f', 0.6, 'M12 7 L15 6.5');
      }
    }
    // All barrels terminate exactly at 24, even though stocks differ in length.
    line(c, '#101e28', 1, 'M24 -1.8 L24 0.8');
    line(c, '#e0e4d8', 0.4, 'M22 -1.8 L23 -1.8');
  }
  function flash(c) {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 10);
    g.addColorStop(0, 'rgba(255,246,209,.95)');
    g.addColorStop(0.35, 'rgba(255,194,96,.48)');
    g.addColorStop(1, 'rgba(255,157,58,0)');
    c.fillStyle = g; c.fillRect(-10, -10, 20, 20);
    paint(c, '#ffecc0', 'M-1 -1 L2 -3 L1 -1 L9 0 L2 1 L3 3 L-1 1 Z', null);
    paint(c, '#fffde7', 'M-1 -0.5 L5 0 L-1 0.5 Z', null);
  }

  function init() {
    if (assets) return assets;
    const specs = [];
    const add = (name, dx, dy, w, h, painter) => specs.push({ name, dx, dy, w, h, painter });
    for (const view of views) {
      add('torso-' + view, -16, -12, 32, 26, c => torso(c, view));
      add('head-' + view, -15, -32, 30, 23, c => head(c, view));
    }
    add('hem-left', -14, 2, 28, 24, c => hem(c, 1));
    add('hem-right', -14, 2, 28, 24, c => hem(c, -1));
    add('leg', -5, -2, 10, 14, leg);
    add('boot', -6, -2, 14, 14, boot);
    add('cape', -18, -14, 24, 26, cape);
    add('scarf', -8, -14, 16, 10, scarf);
    add('scarf-tail', -3, -3, 12, 18, scarfTail);
    add('lantern', -7, -6, 14, 18, lantern);
    add('upper-arm', -3, -5, 14, 13, c => sleeve(c, false));
    add('forearm', 3, -3, 14, 12, c => sleeve(c, true));
    add('glove', -3, -3, 10, 11, c => glove(c, false));
    add('support-glove', -5, -3, 11, 10, c => glove(c, true));
    add('idle-arm', -7, -3, 12, 20, idleArm);
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
    return {
      facing: directions[index], frame: views[frame], mirror, aim, rearGun: sin < -0.25,
      weapon: Object.prototype.hasOwnProperty.call(weaponOutlines, p.weapon) ? p.weapon : 'pistol',
      evolved: !!p.evolved,
      bob: motion ? (moving ? -Math.abs(Math.sin(phase)) * 0.85 : Math.sin(t * 2.1) * 0.22) : 0,
      stepLeft: stride, stepRight: stride ? -stride : 0,
      lean: motion ? inertia * 0.045 - cos * recoil * 0.034 + (dash ? clamp(p.dashDirX, -1, 1) * 0.13 : 0) : 0,
      cloak: motion ? -inertia * 0.09 + Math.sin(t * 3.1 + phase * 0.3) * 0.018 + (dash ? -0.22 : 0) : 0,
      scarf: motion ? Math.sin(t * 3.7 + 0.7) * 0.035 - inertia * 0.08 : 0,
      lantern: motion ? Math.sin(t * 2.4 + phase * 0.35) * 0.025 - inertia * 0.055 : 0,
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
      return { x: x + bodyCos * mx - bodySin * ly, y: y + bodySin * mx + bodyCos * ly + q.bob };
    };
    const lanternLocal = local(-10 - Math.sin(q.lantern) * 4, 10 + Math.cos(q.lantern) * 4);
    const aim = finite(q.aim), gunX = 24 - q.recoil;
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
    ctx.save(); ctx.translate(0, pose.bob); ctx.rotate(pose.lean);
    if (pose.mirror) ctx.scale(-1, 1); fn(); ctx.restore();
  }
  function gun(ctx, q, source) {
    const w = assets.weapons[q.weapon][q.evolved ? 'evolved' : 'base'];
    ctx.save(); ctx.rotate(q.aim); // Never rotate the gun by body lean/wrist: exact gameplay aim.
    // Recoil compresses the arm and slides the weapon along its own axis, not off the aim line.
    joint(ctx, 'upper-arm', source, 1, 0, q.wrist);
    joint(ctx, 'forearm', source, -q.recoil, 0, q.wrist * 0.25);
    joint(ctx, w.part, source, -q.recoil, 0);
    joint(ctx, 'glove', source, w.twoHanded ? 8 - q.recoil : 12 - q.recoil, 1, q.wrist);
    if (w.twoHanded) joint(ctx, 'support-glove', source, 17 - q.recoil, 1.5, -0.12);
    ctx.restore();
  }
  function figure(ctx, q, source) {
    bodySpace(ctx, q, () => {
      joint(ctx, 'cape', source, 0, 0, q.cloak);
      // Thighs and shin boots move as hinged pairs, underneath split coat skirts.
      for (const [x, step] of [[-4.1, q.stepLeft], [4.1, q.stepRight]]) {
        joint(ctx, 'leg', source, x, 7 + step * 0.5, step * 0.055);
        joint(ctx, 'boot', source, x, 14 + step, -step * 0.06, x < 0);
      }
      joint(ctx, 'hem-left', source, 0, 0, q.cloak * 0.65 + q.stepLeft * 0.018);
      joint(ctx, 'hem-right', source, 0, 0, -q.cloak * 0.35 + q.stepRight * 0.018);
    });
    if (q.rearGun) gun(ctx, q, source);
    bodySpace(ctx, q, () => {
      part(ctx, 'torso-' + q.frame, source);
      joint(ctx, 'idle-arm', source, -9, -4, q.lantern * 0.65);
      joint(ctx, 'lantern', source, -10, 10, q.lantern);
      // Asymmetric cape lies on the left shoulder, not as a round blanket over the chest.
      joint(ctx, 'cape', source, 0, 0, q.cloak * 0.75);
      joint(ctx, 'scarf-tail', source, 3, -9, q.scarf);
      part(ctx, 'scarf', source);
    });
    if (!q.rearGun) gun(ctx, q, source);
    // Face always reads clearly above a passing arm. Hat brim remains above the eyes.
    bodySpace(ctx, q, () => part(ctx, 'head-' + q.frame, source));
  }
  function requireInit() { if (!assets) throw new Error('Character.init() must be called before drawing'); }
  function draw(ctx, p, time, options = {}) {
    requireInit(); if (!p || p.dead) return;
    const q = pose(p, time, options);
    ctx.save();
    try {
      ctx.translate(finite(p.x), finite(p.y));
      ctx.imageSmoothingEnabled = true;
      if (options.highContrast) {
        const alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * 0.32;
        ctx.save(); ctx.translate(-0.6, 0); figure(ctx, q, assets.mask); ctx.restore();
        ctx.save(); ctx.translate(0.6, 0); figure(ctx, q, assets.mask); ctx.restore();
        ctx.globalAlpha = alpha;
      }
      figure(ctx, q, assets.canvas);
      if (q.hurt > 0) {
        const alpha = ctx.globalAlpha; ctx.globalAlpha = alpha * q.hurt * 0.8;
        figure(ctx, q, assets.mask); ctx.globalAlpha = alpha;
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
