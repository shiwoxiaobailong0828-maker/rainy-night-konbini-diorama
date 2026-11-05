// 周边建筑：左侧公寓、后排楼房、巷道尽头的小店门口（按 1F → 2F → 3F → 屋顶 分层模块化建造）
import * as THREE from 'three';
import { T, G, box, cyl, sph, plane, group, rod, canvasTex, neonTex, FONT, pick } from './utils.js';
import { register } from './intro.js';
import { SW } from './world.js';

const WIN_COLS = ['#ffd58a', '#ffe9b0', '#bfe3ff', '#ffb98a', '#fff3d0', '#a9ffd8'];

function windowTex(light, curtain, dark = false) {
  return canvasTex(128, 160, (c, w, h) => {
    c.fillStyle = '#2c3258'; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h);
    if (dark) { g.addColorStop(0, '#1c2140'); g.addColorStop(1, '#232a52'); }
    else { g.addColorStop(0, light); g.addColorStop(1, '#ffffff'); }
    c.fillStyle = g; c.fillRect(8, 8, w - 16, h - 16);
    if (!dark) {
      c.fillStyle = curtain; c.globalAlpha = 0.85;
      c.beginPath(); c.moveTo(8, 8); c.lineTo(w * 0.38, 8); c.quadraticCurveTo(w * 0.22, h * 0.5, w * 0.34, h - 8); c.lineTo(8, h - 8); c.fill();
      c.beginPath(); c.moveTo(w - 8, 8); c.lineTo(w * 0.66, 8); c.quadraticCurveTo(w * 0.8, h * 0.5, w * 0.7, h - 8); c.lineTo(w - 8, h - 8); c.fill();
      c.globalAlpha = 1;
    } else {
      c.fillStyle = 'rgba(160,190,255,0.12)'; c.fillRect(14, 14, w * 0.3, h - 28);
    }
    c.fillStyle = '#2c3258'; c.fillRect(w / 2 - 3, 8, 6, h - 16); c.fillRect(8, h * 0.62, w - 16, 5);
  });
}

const winMats = [];
function winMat() {
  if (!winMats.length) {
    for (let i = 0; i < 9; i++) {
      const dark = i >= 7;
      const m = new THREE.MeshBasicMaterial({ map: windowTex(pick(WIN_COLS), pick(['#e8708a', '#7bb0e8', '#f3c969', '#9be0b4', '#c7a6f0']), dark), color: new THREE.Color(dark ? 1 : 1.04, dark ? 1 : 1.04, dark ? 1 : 1.04) });
      winMats.push(m);
    }
  }
  return pick(winMats);
}

/** 带栏杆的阳台（封装为单个整体部件） */
function balcony(parent, x, y, z, w, facing = 1) {
  const bg = group(x, y, z);
  const m = T('#c9cde8', 0.35);
  box(bg, w, 0.08, 0.55, 0, 0, facing * 0.27, m);
  box(bg, w, 0.05, 0.04, 0, 0.9, facing * 0.52, T('#9aa2c8', 0.35));
  const n = Math.round(w / 0.16);
  for (let i = 0; i <= n; i++) box(bg, 0.025, 0.85, 0.025, -w / 2 + (i / n) * w, 0.06, facing * 0.52, T('#aab2d6', 0.3));
  parent.add(bg);
  return bg;
}

function acUnit(parent, x, y, z, ry) {
  const u = group(x, y, z, ry);
  box(u, 0.8, 0.6, 0.34, 0, 0, 0, T('#e2e6f5', 0.4));
  const f = cyl(u, 0.22, 0.22, 0.03, -0.1, 0.3, 0.18, T('#434a74', 0.25), 20); f.rotation.x = Math.PI / 2;
  const c = cyl(u, 0.07, 0.07, 0.03, -0.1, 0.3, 0.2, T('#262b50'), 10); c.rotation.x = Math.PI / 2;
  box(u, 0.1, 0.4, 0.03, 0.3, 0.1, 0.18, T('#8f97bd', 0.25));
  box(u, 0.06, 0.04, 0.5, -0.25, -0.04, -0.3, T('#8f97bd', 0.3));
  box(u, 0.06, 0.04, 0.5, 0.25, -0.04, -0.3, T('#8f97bd', 0.3));
  parent.add(u);
  return u;
}
export { acUnit };

export function buildApartments(scene) {
  const g = group();

  // ====== 左侧公寓（按 1F → 2F → 3F → 屋顶 严格分层构建）======
  {
    const x0 = -8, x1 = -5.6, z0 = -5.4, z1 = 0.8;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
    const wallM = T('#d6c7dc', 0.3), trimM = T('#f0e8f4', 0.45);

    // --- 公寓 1F (min.y = 0.15) ---
    const f1 = group();
    box(f1, W + 0.1, 0.5, D + 0.1, cx, SW, cz, T('#7a7fae', 0.3));
    box(f1, W, 2.25, D, cx, SW, cz, wallM);
    box(f1, W + 0.12, 0.08, D + 0.12, cx, 2.4, cz, trimM);
    const y1 = 1.0 + SW;
    for (const x of [-7.3, -6.0]) plane(f1, 0.9, 1.1, x, y1 + 0.7, z1 + 0.01, winMat());
    for (const z of [-4.4, -2.9, -1.4, 0.1]) plane(f1, 0.9, 1.1, x1 + 0.01, y1 + 0.7, z, winMat(), Math.PI / 2);
    box(f1, 1.1, 1.7, 0.08, -6.65, SW, z1 + 0.04, T('#5a4e7a', 0.35));
    plane(f1, 0.9, 1.5, -6.65, SW + 0.9, z1 + 0.09, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a0').multiplyScalar(0.95) }));
    box(f1, 1.3, 0.1, 0.5, -6.65, SW + 1.8, z1 + 0.25, T('#8f97bd', 0.4));
    sph(f1, 0.1, -6.65, SW + 1.72, z1 + 0.3, G('#fff0c0', 1.35), 12);
    for (let k = 0; k < 3; k++) box(f1, 0.28, 0.3, 0.1, -7.55 + k * 0.32, SW + 0.9, z1 + 0.05, T(pick(['#e8708a', '#7bb0e8', '#f3c969']), 0.5));
    box(f1, 0.14, 0.5, 0.4, x1 + 0.07, SW + 0.6, -0.7, T('#9aa2c8', 0.4));
    cyl(f1, 0.05, 0.05, 2.25, x1 + 0.06, SW, -5.0, T('#c4c9e4', 0.3));
    g.add(f1);

    // --- 公寓 2F (min.y = 2.4) ---
    const f2 = group();
    box(f2, W, 2.0, D, cx, 2.4, cz, wallM);
    box(f2, W + 0.12, 0.08, D + 0.12, cx, 4.4, cz, trimM);
    const y2 = 3.0 + SW;
    for (const x of [-7.3, -6.0]) {
      plane(f2, 0.9, 1.1, x, y2 + 0.7, z1 + 0.01, winMat());
      balcony(f2, x, y2 - 0.1, z1, 1.15);
    }
    for (const z of [-4.4, -2.9, -1.4, 0.1]) plane(f2, 0.9, 1.1, x1 + 0.01, y2 + 0.7, z, winMat(), Math.PI / 2);
    acUnit(f2, x1 + 0.2, SW + 2.55, -3.6, Math.PI / 2);
    const lamp = group(x1 + 0.12, SW + 2.4, -1.6);
    box(lamp, 0.12, 0.12, 0.3, 0, 0, 0, T('#8f97bd', 0.3));
    sph(lamp, 0.1, 0.12, 0.0, 0, G('#ffc67a', 1.5), 12);
    f2.add(lamp);
    cyl(f2, 0.05, 0.05, 2.0, x1 + 0.06, 2.4, -5.0, T('#c4c9e4', 0.3));
    g.add(f2);

    // --- 公寓 3F (min.y = 4.4) ---
    const f3 = group();
    box(f3, W, 2.25, D, cx, 4.4, cz, wallM);
    box(f3, W + 0.12, 0.08, D + 0.12, cx, 6.4, cz, trimM);
    const y3 = 5.0 + SW;
    for (const x of [-7.3, -6.0]) {
      plane(f3, 0.9, 1.1, x, y3 + 0.7, z1 + 0.01, winMat());
      balcony(f3, x, y3 - 0.1, z1, 1.15);
    }
    for (const z of [-4.4, -2.9, -1.4, 0.1]) plane(f3, 0.9, 1.1, x1 + 0.01, y3 + 0.7, z, winMat(), Math.PI / 2);
    acUnit(f3, x1 + 0.2, SW + 4.5, -1.0, Math.PI / 2);
    cyl(f3, 0.05, 0.05, 2.25, x1 + 0.06, 4.4, -5.0, T('#c4c9e4', 0.3));
    g.add(f3);

    // --- 公寓屋顶与水塔 (min.y = 6.65) ---
    const rf = group();
    const h = 6.5;
    box(rf, W + 0.2, 0.18, D + 0.2, cx, h + SW, cz, T('#a6abcf', 0.3));
    cyl(rf, 0.5, 0.5, 0.9, -7.0, h + SW + 0.18, -3.5, T('#dfe3f5', 0.45), 20);
    cyl(rf, 0.52, 0.52, 0.06, -7.0, h + SW + 0.86, -3.5, T('#6e75a8', 0.3), 20);
    for (const a of [0, 1, 2, 3]) box(rf, 0.06, 0.4, 0.06, -7.0 + Math.cos(a * 1.57 + 0.78) * 0.4, h + SW + 0.18, -3.5 + Math.sin(a * 1.57 + 0.78) * 0.4, T('#7d84b4', 0.3));
    rod(rf, [-6.2, h + SW + 0.18, -1.0], [-6.2, h + SW + 1.6, -1.0], 0.02, T('#aab2d6'));
    rod(rf, [-6.5, h + SW + 1.4, -1.0], [-5.9, h + SW + 1.4, -1.0], 0.02, T('#aab2d6'));
    rod(rf, [-6.4, h + SW + 1.0, -1.0], [-6.0, h + SW + 1.0, -1.0], 0.02, T('#aab2d6'));
    g.add(rf);
  }

  // ====== 后排楼房（按 1F → 2F → 屋顶 严格分层构建）======
  {
    const x0 = -5.6, x1 = 5.8, z0 = -8, z1 = -5.4;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
    const wallM = T('#b7b0d8', 0.3), trimM = T('#ece6f6', 0.45);

    // --- 后楼 1F + 巷道尽头小酒馆 (min.y = 0.15) ---
    const b1 = group();
    box(b1, W, 0.5, D + 0.1, cx, SW, cz, T('#6b709e', 0.3));
    box(b1, W, 2.5, D, cx, SW, cz, wallM);
    box(b1, W + 0.1, 0.08, D + 0.1, cx, 2.6, cz, trimM);
    const y1 = 1.2 + SW;
    for (const x of [-2.9, -1.3, 0.3, 1.9, 3.5, 5.0]) plane(b1, 0.9, 1.1, x, y1 + 0.7, z1 + 0.01, winMat());
    const dx = -4.75;
    box(b1, 1.0, 1.8, 0.1, dx, SW, z1 + 0.05, T('#7a4b38', 0.45));
    const noren = new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#b8283c'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.font = `900 70px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('酒処', w / 2, h * 0.45);
      c.strokeStyle = '#7b1626'; c.lineWidth = 4; for (const x of [w / 3, w * 2 / 3]) { c.beginPath(); c.moveTo(x, 40); c.lineTo(x, h); c.stroke(); }
    }), color: new THREE.Color(1.05, 1.05, 1.05) });
    plane(b1, 0.9, 0.45, dx, SW + 1.45, z1 + 0.14, noren);
    box(b1, 1.2, 0.1, 0.35, dx, SW + 1.9, z1 + 0.2, T('#5a3a30', 0.4));
    for (const lx of [dx - 0.8, dx + 0.8]) {
      const lt = sph(b1, 0.17, lx, SW + 1.6, z1 + 0.25, G('#ff5a3c', 1.25), 14); lt.scale.set(1, 1.3, 1);
      cyl(b1, 0.1, 0.1, 0.04, lx, SW + 1.88, z1 + 0.25, T('#2a2030'), 8);
    }
    const pn2 = new THREE.MeshBasicMaterial({ map: neonTex('営業中', 300, 120, '#4fe3ff', { size: 70 }), transparent: true, color: new THREE.Color(1.2, 1.2, 1.2) });
    plane(b1, 0.7, 0.28, dx, SW + 1.1, z1 + 0.13, pn2);
    for (let k = 0; k < 3; k++) box(b1, 0.4, 0.3, 0.3, dx + 1.1, SW + k * 0.3, z1 + 0.5, T(pick(['#e8a23a', '#d8664a', '#4a8bd8']), 0.45));
    box(b1, 0.5, 0.4, 0.4, dx - 0.95, SW, z1 + 0.5, T('#c9a06a', 0.45));
    box(b1, 0.45, 0.3, 0.35, dx - 1.0, SW + 0.4, z1 + 0.5, T('#d9b27a', 0.45));
    sph(b1, 0.22, dx - 0.5, SW + 0.2, z1 + 0.75, T('#3a406a', 0.2), 10);
    acUnit(b1, 2.8, SW + 0.2, z1 + 0.25, 0);
    cyl(b1, 0.05, 0.05, 2.45, -3.7, SW, z1 + 0.1, T('#c4c9e4', 0.3));
    g.add(b1);

    // --- 后楼 2F (min.y = 2.6) ---
    const b2 = group();
    box(b2, W, 2.75, D, cx, 2.6, cz, wallM);
    box(b2, W + 0.1, 0.08, D + 0.1, cx, 5.2, cz, trimM);
    const y2 = 3.4 + SW;
    for (const x of [-2.9, -1.3, 0.3, 1.9, 3.5, 5.0]) {
      plane(b2, 0.9, 1.1, x, y2 + 0.7, z1 + 0.01, winMat());
      balcony(b2, x, y2 - 0.1, z1, 1.15);
    }
    const pn = new THREE.MeshBasicMaterial({ map: neonTex('BAR', 256, 128, '#ff4fa3'), transparent: true, color: new THREE.Color(1.2, 1.2, 1.2) });
    plane(b2, 0.9, 0.45, dx, SW + 2.6, z1 + 0.05, pn);
    const pn3 = new THREE.MeshBasicMaterial({ map: neonTex('ラーメン', 420, 130, '#ff7a45', { size: 76 }), transparent: true, color: new THREE.Color(1.2, 1.2, 1.2) });
    plane(b2, 1.1, 0.34, 5.0, SW + 3.55, z1 + 0.02, pn3);
    cyl(b2, 0.05, 0.05, 2.75, -3.7, 2.6, z1 + 0.1, T('#c4c9e4', 0.3));
    g.add(b2);

    // --- 后楼屋顶 (min.y = 5.35) ---
    const brf = group();
    const h = 5.2;
    box(brf, W + 0.2, 0.18, D + 0.2, cx, h + SW, cz, T('#a6abcf', 0.3));
    acUnit(brf, 3.5, h + SW + 0.18, -6.4, 0);
    acUnit(brf, 4.5, h + SW + 0.18, -6.4, 0);
    box(brf, 0.3, 1.0, 0.3, -1.0, h + SW + 0.18, -6.8, T('#8f97bd', 0.3));
    g.add(brf);
  }

  scene.add(g);
  register(g, 'shell');
}
