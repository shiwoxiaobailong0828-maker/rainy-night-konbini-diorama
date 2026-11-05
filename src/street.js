// 街头设施：自动贩卖机、自行车、雨伞架、垃圾桶、路灯、电线杆与电线、路牌、护栏、停车位、公告栏、植物
import * as THREE from 'three';
import { T, G, box, cyl, sph, plane, flat, group, rod, canvasTex, labelTex, FONT, rrect, rnd, rr, pick } from './utils.js';
import { register } from './intro.js';
import { SW } from './world.js';
import { STORE } from './store.js';

const PROD = ['#ff5a5f', '#ffb627', '#4cc9f0', '#7bd389', '#f78fb3', '#9b7bff', '#ffd93d', '#ff8a3d', '#3fd0c9', '#e85d9b'];
const steel = () => T('#434a74', 0.3);

// ---------- 自动贩卖机 ----------
function drinksTex(seed) {
  return canvasTex(256, 400, (c, w, h) => {
    c.fillStyle = '#161a3a'; c.fillRect(0, 0, w, h);
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) {
      const x = 14 + k * 59, y = 14 + r * 70;
      const col = PROD[(r * 4 + k + seed * 3) % PROD.length];
      c.fillStyle = '#ffffff'; rrect(c, x, y, 44, 50, 8); c.fill();
      c.fillStyle = col; rrect(c, x + 3, y + 8, 38, 34, 6); c.fill();
      c.fillStyle = '#fff'; c.fillRect(x + 10, y + 20, 24, 6);
      c.fillStyle = (k + r) % 3 === 0 ? '#ff3b3b' : '#3b9bff';
      c.fillRect(x + 4, y + 53, 36, 9);
    }
  });
}

function vending(parent, x, z, ry, body, header, seed) {
  const g = group(x, SW, z, ry);
  box(g, 0.9, 1.85, 0.78, 0, 0, 0, T(body, 0.4));
  box(g, 0.94, 0.06, 0.82, 0, 1.85, 0, T('#e8ebf8', 0.5));
  const tex = drinksTex(seed);
  plane(g, 0.62, 0.98, -0.1, 1.08, 0.395, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.05, 1.05, 1.05) }));
  box(g, 0.68, 1.04, 0.02, -0.1, 0.56, 0.385, T('#232850', 0.3));
  box(g, 0.84, 0.2, 0.04, 0, 1.63, 0.4, G(header, 1.18));
  box(g, 0.2, 0.9, 0.03, 0.34, 0.6, 0.395, T('#2f3562', 0.4));
  box(g, 0.12, 0.08, 0.04, 0.34, 1.2, 0.41, G('#8cf0ff', 1.4));
  box(g, 0.12, 0.2, 0.04, 0.34, 0.8, 0.41, T('#c8cfee', 0.5));
  box(g, 0.56, 0.16, 0.05, -0.1, 0.12, 0.4, T('#10132c', 0.1));
  parent.add(g);
  return g;
}

// ---------- 自行车 ----------
function bike(parent, x, z, ry, color) {
  const g = group(x, SW, z, ry);
  const fr = T(color, 0.5), dark = T('#262b4e', 0.3), met = T('#aab2d6', 0.4);
  const wheel = (wx) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 24), dark);
    t.position.set(wx, 0.32, 0); g.add(t);
    const hub = cyl(g, 0.04, 0.04, 0.08, wx, 0.28, 0, met, 8); hub.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const sp = box(g, 0.58, 0.008, 0.008, wx, 0.32, 0, met); sp.rotation.z = (i / 3) * Math.PI;
    }
    box(g, 0.64, 0.025, 0.1, wx - 0.0, 0.62 - 0.0, 0, fr).scale.set(0.3, 1, 1);
  };
  wheel(-0.55); wheel(0.55);
  const pts = { bb: [0, 0.3], seat: [-0.2, 0.78], head: [0.4, 0.74], rh: [-0.55, 0.32], fh: [0.55, 0.32] };
  const P = (k) => [pts[k][0], pts[k][1], 0];
  rod(g, P('bb'), P('seat'), 0.018, fr); rod(g, P('bb'), P('head'), 0.02, fr);
  rod(g, P('seat'), P('head'), 0.018, fr); rod(g, P('seat'), P('rh'), 0.014, fr);
  rod(g, P('bb'), P('rh'), 0.014, fr); rod(g, P('head'), P('fh'), 0.016, met);
  rod(g, P('head'), [0.36, 1.0, 0], 0.016, met);
  rod(g, [0.36, 1.0, -0.26], [0.36, 1.0, 0.26], 0.014, met);
  box(g, 0.28, 0.05, 0.14, -0.22, 0.8, 0, dark);
  rod(g, [-0.2, 0.78, 0], [-0.22, 0.8, 0], 0.012, met);
  // 前车筐
  box(g, 0.3, 0.2, 0.34, 0.62, 0.78, 0, T('#d7dcef', 0.35));
  box(g, 0.26, 0.04, 0.3, 0.62, 0.9, 0, T('#7a80ad', 0.3));
  // 后座架
  box(g, 0.32, 0.03, 0.14, -0.62, 0.62, 0, met);
  // 车铃/车灯
  sph(g, 0.035, 0.7, 0.78 - 0.1, 0, G('#ffe9a0', 1.2), 8);
  g.rotation.z = 0;
  const holder = group(0, 0, 0);
  holder.add(g);
  // 倾斜（侧撑）
  g.rotation.x = 0.1;
  parent.add(holder);
  return holder;
}

// ---------- 雨伞架 + 雨伞 ----------
function umbrellaStand(parent, x, z, ry) {
  const g = group(x, SW, z, ry);
  const met = T('#9aa2c8', 0.45);
  box(g, 1.0, 0.06, 0.34, 0, 0, 0, met);
  box(g, 1.0, 0.04, 0.04, 0, 0.55, -0.15, met);
  box(g, 0.04, 0.58, 0.04, -0.5, 0, -0.15, met); box(g, 0.04, 0.58, 0.04, 0.5, 0, -0.15, met);
  box(g, 0.04, 0.58, 0.04, -0.5, 0, 0.15, met); box(g, 0.04, 0.58, 0.04, 0.5, 0, 0.15, met);
  box(g, 1.0, 0.04, 0.04, 0, 0.55, 0.15, met);
  const cols = [['#eaf7ff', 0.9], ['#ffd23f', 0.6], ['#2f3f9e', 0.45], ['#ff6fb5', 0.55], ['#58d2c8', 0.55], ['#eaf7ff', 0.9]];
  cols.forEach(([c, e], k) => {
    const u = group(-0.4 + k * 0.16, 0.08, rr(-0.06, 0.06));
    const body = cyl(u, 0.016, 0.06, 0.78, 0, 0, 0, T(c, e), 8);
    cyl(u, 0.006, 0.006, 0.2, 0, 0.74, 0, T('#d8dcf0', 0.4), 6).position.y = 0.84;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 10, Math.PI), T('#444a72', 0.3));
    hook.position.set(0.035, 0.94, 0); u.add(hook);
    u.rotation.z = (rnd() - 0.5) * 0.12; u.rotation.x = (rnd() - 0.5) * 0.1;
    g.add(u);
  });
  parent.add(g);
}

// ---------- 垃圾桶 ----------
function bins(parent, x, z, ry) {
  const g = group(x, SW, z, ry);
  const defs = [['可燃', '#3b9b6b'], ['ペット', '#3b7bd6'], ['缶・びん', '#8a90b0']];
  defs.forEach(([tx, c], i) => {
    const bx = i * 0.5 - 0.5;
    box(g, 0.42, 0.62, 0.36, bx, 0, 0, T(c, 0.45));
    box(g, 0.46, 0.06, 0.4, bx, 0.62, 0, T(c, 0.6));
    box(g, 0.22, 0.06, 0.04, bx, 0.46, 0.185, T('#10132c'));
    plane(g, 0.3, 0.14, bx, 0.28, 0.185, new THREE.MeshBasicMaterial({ map: labelTex(tx, 192, 88, { bg: '#ffffff', fg: '#222', size: 46, radius: 10 }) }));
  });
  parent.add(g);
}

// ---------- 路灯 ----------
export const lampSpots = [];
function streetLamp(parent, x, z, ry, h = 4.6) {
  const g = group(x, SW, z, ry);
  const m = T('#3a4064', 0.35);
  cyl(g, 0.09, 0.12, 0.3, 0, 0, 0, T('#4a5078', 0.35), 10);
  cyl(g, 0.045, 0.07, h, 0, 0.3, 0, m, 10);
  rod(g, [0, h + 0.1, 0], [0.5, h + 0.45, 0], 0.035, m);
  rod(g, [0.5, h + 0.45, 0], [1.1, h + 0.4, 0], 0.035, m);
  const head = group(1.1, h + 0.3, 0);
  box(head, 0.55, 0.1, 0.28, 0, 0.08, 0, m);
  box(head, 0.5, 0.05, 0.24, 0, 0.0, 0, G('#fff0c8', 2.2));
  box(head, 0.6, 0.04, 0.32, 0, 0.18, 0, T('#565d86', 0.35));
  g.add(head);
  parent.add(g);
  // 光源世界坐标
  const c = Math.cos(ry), s = Math.sin(ry);
  lampSpots.push({ x: x + 1.1 * c, y: SW + h + 0.2, z: z - 1.1 * s });
  return g;
}

// ---------- 电线杆 ----------
const poleAttach = [];
function utilityPole(parent, x, z, name, ry = 0) {
  const g = group(x, SW, z, ry);
  const concrete = T('#9fa3c4', 0.4);
  cyl(g, 0.1, 0.14, 6.8, 0, 0, 0, concrete, 12);
  // 横担 ×2
  for (const [y, w] of [[6.45, 1.5], [5.85, 1.1]]) {
    box(g, 0.08, 0.1, w, 0, y, 0, T('#6a6f98', 0.35));
    for (const k of [-1, 0, 1]) {
      const iz = k * (w / 2 - 0.1);
      cyl(g, 0.04, 0.04, 0.16, 0.0, y + 0.1, iz, T(k === 0 ? '#e0f2f5' : '#d8d3f0', 0.7), 8);
    }
  }
  // 变压器
  const tr = cyl(g, 0.22, 0.22, 0.6, 0.0, 4.9, 0.28, T('#8b97a8', 0.4), 14);
  cyl(g, 0.24, 0.24, 0.05, 0.0, 5.5, 0.28, T('#6a7490', 0.35), 14);
  // 标牌：电杆编号 + 黄色广告牌
  box(g, 0.02, 0.22, 0.14, 0.12, 3.6, 0, T('#ffffff', 0.7));
  const ad = plane(g, 0.34, 0.8, 0.0, 2.8, 0.12 + 0.0, new THREE.MeshBasicMaterial({ map: labelTex('歯科', 128, 300, { bg: '#ffd23f', fg: '#222', size: 80, sub: '24h', subSize: 52, radius: 12 }) }));
  ad.rotation.y = Math.PI / 2; ad.position.set(0.13, 2.6, 0.0);
  // 脚蹬
  for (let k = 0; k < 6; k++) box(g, 0.04, 0.02, 0.18, 0, 1.0 + k * 0.4, 0, T('#555b86', 0.3));
  parent.add(g);
  const cy = SW + 6.55;
  const pts = { x, z, names: name, y1: SW + 6.55, y2: SW + 5.95, w1: 1.5, w2: 1.1 };
  poleAttach.push(pts);
  return pts;
}

function wire(parent, a, b, sag, r = 0.012) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const p = A.clone().lerp(B, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 4, false);
  const m = new THREE.Mesh(geo, T('#1b1e3a', 0.0));
  parent.add(m);
  return m;
}

// ---------- 路标 ----------
function stopSign(parent, x, z, ry) {
  const g = group(x, SW, z, ry);
  cyl(g, 0.022, 0.022, 2.2, 0, 0, 0, T('#c9cde8', 0.5), 8);
  const wh = new THREE.Mesh(new THREE.CircleGeometry(0.36, 3, -Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
  wh.position.set(0, 2.05, 0.03); g.add(wh);
  const rd = new THREE.Mesh(new THREE.CircleGeometry(0.29, 3, -Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e02a38').multiplyScalar(1.1), side: THREE.DoubleSide }));
  rd.position.set(0, 2.07, 0.035); g.add(rd);
  const tx = plane(g, 0.34, 0.14, 0, 2.15, 0.04, new THREE.MeshBasicMaterial({ map: labelTex('止まれ', 256, 100, { bg: null, fg: '#fff', size: 72 }), transparent: true }));
  const bk = wh.clone(); bk.position.z = 0.02; bk.material = T('#9aa2c8', 0.3, { side: THREE.DoubleSide }); g.add(bk);
  parent.add(g);
}

function curveMirror(parent, x, z, ry) {
  const g = group(x, SW, z, ry);
  const orange = T('#ee7f2d', 0.55), white = T('#f4f1ff', 0.6);
  for (let i = 0; i < 6; i++) cyl(g, 0.045, 0.045, 0.5, 0, i * 0.5, 0, i % 2 ? white : orange, 10);
  box(g, 0.08, 0.08, 0.3, 0, 3.0, 0.16, orange);
  const mir = canvasTex(128, 128, (c, w, h) => {
    const gr = c.createRadialGradient(46, 42, 6, 64, 64, 62);
    gr.addColorStop(0, '#fff2cf'); gr.addColorStop(0.25, '#e29ad8'); gr.addColorStop(0.6, '#4a63c4'); gr.addColorStop(1, '#1d2a66');
    c.fillStyle = gr; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
    c.strokeStyle = '#ffffffaa'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 74); c.quadraticCurveTo(64, 48, 128, 76); c.stroke();
    c.beginPath(); c.moveTo(20, 20); c.lineTo(108, 108); c.stroke();
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), new THREE.MeshBasicMaterial({ map: mir, side: THREE.DoubleSide }));
  disc.position.set(0, 3.2, 0.32); g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 8, 28), orange);
  rim.position.copy(disc.position); g.add(rim);
  const bk = cyl(g, 0.34, 0.34, 0.05, 0, 3.2 - 0.025, 0.28, T('#d96f20', 0.5), 28); bk.rotation.x = Math.PI / 2;
  parent.add(g);
}

function signPole(parent, x, z, ry, tex, w, h, y = 2.0) {
  const g = group(x, SW, z, ry);
  cyl(g, 0.022, 0.022, y + h / 2 + 0.05, 0, 0, 0, T('#c9cde8', 0.5), 8);
  box(g, w + 0.04, h + 0.04, 0.03, 0, y - h / 2, 0.0, T('#e8ebf8', 0.6));
  plane(g, w, h, 0, y, 0.025, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.1, 1.1, 1.1) }));
  parent.add(g);
}

// ---------- 护栏 ----------
function guardrail(parent, pts) {
  const gg = group();
  const white = T('#f2f4ff', 0.7), red = T('#ff7a3a', 0.8), metal = T('#aab2d6', 0.4);
  let acc = 0;
  const posts = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    acc += Math.hypot(x1 - x0, z1 - z0);
    if (acc >= 0.5 || i === pts.length - 1) { posts.push(pts[i]); acc = 0; }
  }
  posts.forEach(([x, z]) => cyl(gg, 0.03, 0.03, 0.6, x, SW, z, metal, 8));
  for (let i = 1; i < posts.length; i++) {
    const [x0, z0] = posts[i - 1], [x1, z1] = posts[i];
    rod(gg, [x0, SW + 0.58, z0], [x1, SW + 0.58, z1], 0.028, white, 8);
    rod(gg, [x0, SW + 0.36, z0], [x1, SW + 0.36, z1], 0.022, i % 2 ? red : white, 8);
  }
  parent.add(gg);
}

// ---------- 海报 / 公告栏 ----------
function posterTex(title, bg, fg, lines = 3) {
  return canvasTex(160, 220, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${title.length > 4 ? 30 : 42}px ${FONT}`; c.fillText(title, w / 2, 46);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(w / 2, 118, 30, 0, 7); c.fill();
    c.fillStyle = fg; c.globalAlpha = 0.7;
    for (let i = 0; i < lines; i++) c.fillRect(20, 170 + i * 14, w - 40 - (i % 2) * 30, 6);
  });
}

function noticeBoard(parent, x, z, ry) {
  const g = group(x, SW, z, ry);
  const wood = T('#7a5a48', 0.45);
  box(g, 0.08, 1.6, 0.08, -0.6, 0, 0, wood); box(g, 0.08, 1.6, 0.08, 0.6, 0, 0, wood);
  box(g, 1.3, 0.95, 0.08, 0, 0.7, 0, T('#c7a46a', 0.5));
  const items = [
    ['迷い猫', '#ffd23f', '#222'], ['夏祭り', '#ff6fb5', '#fff'], ['防犯', '#3b7bd6', '#fff'],
    ['町内会', '#7bd389', '#1a3a20'], ['ゴミ出し', '#f4f1de', '#222'], ['募集', '#ff8a3d', '#fff'],
  ];
  items.forEach(([tx, bg, fg], i) => {
    const col = i % 3, row = (i / 3) | 0;
    const p = plane(g, 0.32, 0.4, -0.4 + col * 0.4, 0.97 - row * 0.45 + 0.0, 0.05, new THREE.MeshBasicMaterial({ map: posterTex(tx, bg, fg), color: new THREE.Color(1.05, 1.05, 1.05) }));
    p.rotation.z = (rnd() - 0.5) * 0.08;
  });
  const gl = plane(g, 1.2, 0.88, 0, 1.17 - 0.5 + 0.0, 0.07, new THREE.MeshBasicMaterial({ color: '#bcd8ff', transparent: true, opacity: 0.12, depthWrite: false }));
  gl.position.y = 1.17; gl.userData.noOutline = true;
  const roof = box(g, 1.5, 0.08, 0.5, 0, 1.68, 0.05, T('#5c4a68', 0.4)); roof.rotation.x = -0.15;
  parent.add(g);
}

// ---------- 植物 ----------
export const swayObjects = [];
function tree(parent, x, z, s = 1) {
  const g = group(x, SW, z);
  cyl(g, 0.1 * s, 0.16 * s, 1.8 * s, 0, 0, 0, T('#6b5460', 0.35), 8);
  const crown = group(0, 1.8 * s, 0);
  const leaf = [T('#3e8d79', 0.5), T('#4aa388', 0.5), T('#33806f', 0.5)];
  for (const [dx, dy, dz, r] of [[0, 0.5, 0, 0.95], [0.55, 0.1, 0.1, 0.7], [-0.5, 0.2, -0.2, 0.75], [0.1, 1.1, 0.1, 0.6], [-0.2, 0.0, 0.5, 0.6]]) {
    sph(crown, r * s, dx * s, dy * s, dz * s, pick(leaf), 10);
  }
  g.add(crown);
  swayObjects.push(crown);
  parent.add(g);
}
function bush(parent, x, z, w, s = 1) {
  const g = group(x, SW, z);
  const m = [T('#3b8470', 0.5), T('#47997f', 0.5)];
  for (let i = 0; i < Math.round(w / 0.4); i++) {
    const b = sph(g, 0.3 * s, i * 0.38 - w / 2, 0.25, rr(-0.05, 0.05), pick(m), 8);
    b.scale.y = 0.85;
  }
  swayObjects.push(g);
  parent.add(g);
}
function pot(parent, x, z, c = '#d97a5a') {
  const g = group(x, SW, z);
  cyl(g, 0.16, 0.12, 0.28, 0, 0, 0, T(c, 0.5), 10);
  sph(g, 0.22, 0, 0.42, 0, T('#3fa27a', 0.55), 8);
  sph(g, 0.13, 0.12, 0.6, 0.0, T('#ff8fb8', 0.7), 6);
  parent.add(g);
}

// ---------- 停车位 ----------
function parking(parent) {
  const pg = group();
  const line = T('#eef0fb', 0.38);
  for (const x of [-3.5, -1.7, 0.1, 1.9]) flat(pg, 0.08, 2.0, x, SW + 0.01, 2.75, line);
  flat(pg, 5.4, 0.08, -0.8, SW + 0.01, 3.7, line);
  for (const x of [-2.6, -0.8, 1.0]) box(pg, 1.2, 0.1, 0.16, x, SW, 1.95, T('#a4a9c8', 0.35));
  // 数字
  [1, 2, 3].forEach((n, i) => {
    flat(pg, 0.5, 0.5, -2.6 + i * 1.8, SW + 0.012, 3.2, new THREE.MeshBasicMaterial({ map: labelTex(String(n), 128, 128, { bg: null, fg: '#e6e9f8', size: 100 }), transparent: true, opacity: 0.8, depthWrite: false }));
  });
  parent.add(pg);
  // 路桩
  const bg = group();
  for (const x of [2.5, 3.2, 3.9]) {
    cyl(bg, 0.07, 0.07, 0.65, x, SW, 3.78, T('#eef0fb', 0.45), 10);
    cyl(bg, 0.075, 0.075, 0.08, x, SW + 0.45, 3.78, G('#ff7a3a', 1.2), 10);
  }
  parent.add(bg);
}

// =====================================================================
export const wirePoints = {};
export function buildStreet(scene) {
  const g = group();
  const { x0, x1, z0, z1, top } = STORE;

  // 自动贩卖机（贴东墙，面朝 +x）
  vending(g, x1 + 0.45, -3.75, Math.PI / 2, '#d9333f', '#ff3b4a', 0);
  vending(g, x1 + 0.45, -2.85, Math.PI / 2, '#2f6fd6', '#4aa8ff', 1);
  vending(g, x1 + 0.45, -1.95, Math.PI / 2, '#e8ecf6', '#6cf0c0', 2);
  bins(g, x1 + 0.3, -0.98, Math.PI / 2);
  // 东墙海报
  [['新作スイーツ', '#ff6fb5', '#fff', -3.9], ['夜のコーヒー', '#6b4a3a', '#ffe9b0', -3.2], ['宅配便', '#3b9be6', '#fff', -2.5]].forEach(([t, bg, fg, z]) => {
    const p = plane(g, 0.5, 0.7, x1 + 0.09, SW + 2.35, z + 0.1, new THREE.MeshBasicMaterial({ map: posterTex(t, bg, fg), color: new THREE.Color(1.1, 1.1, 1.1) }), Math.PI / 2);
  });

  // 门前：雨伞架、A 字立牌、自行车
  umbrellaStand(g, 0.55, 0.98, 0.0);
  const ab = group(3.2, SW, 1.1, -0.35);
  box(ab, 0.5, 0.8, 0.05, 0, 0.0, 0.12, T('#2b3160', 0.5)).rotation.x = 0.25;
  box(ab, 0.5, 0.8, 0.05, 0, 0.0, -0.12, T('#2b3160', 0.5)).rotation.x = -0.25;
  plane(ab, 0.44, 0.62, 0, 0.42, 0.17, new THREE.MeshBasicMaterial({ map: labelTex('おでん', 256, 360, { bg: '#fff3d0', fg: '#b8283c', size: 86, sub: '雨の日限定', subSize: 34, radius: 10 }) })).rotation.x = -0.25;
  g.add(ab);
  bike(g, -3.0, 1.0, 0.05, '#4bc0b4');
  bike(g, -7.5, 2.0, Math.PI / 2 + 0.05, '#ff7fa8');
  bike(g, -7.0, 1.9, Math.PI / 2 - 0.04, '#ffc94a');
  bike(g, -6.5, 2.0, Math.PI / 2 + 0.03, '#6f8cff');

  // 停车位
  parking(g);

  // 路灯 ×2
  streetLamp(g, 5.4, 0.6, 0, 4.4);
  streetLamp(g, -4.2, 4.45, -Math.PI / 2, 4.4);

  // 电线杆 + 电线
  const P1 = utilityPole(g, 5.3, -3.2, 'P1', 0);
  const P2 = utilityPole(g, -3.65, 4.45, 'P2', 0);
  const P3 = utilityPole(g, -7.3, 4.45, 'P3', 0);
  const wg = group();
  for (const k of [-1, 0, 1]) {
    const a = [P1.x, P1.y1 + 0.15, P1.z + k * 0.65], b = [P2.x, P2.y1 + 0.15, P2.z + k * 0.65], c = [P3.x, P3.y1 + 0.15, P3.z + k * 0.65];
    wire(wg, a, b, 0.55); wire(wg, b, c, 0.35);
  }
  // 引入线：杆 → 便利店 / 公寓 / 后楼
  wire(wg, [P2.x, P2.y2 + 0.15, P2.z], [-1.0, top + 0.5, z1 + 0.1], 0.45, 0.01);
  wire(wg, [P2.x, P2.y2 + 0.15, P2.z - 0.4], [-3.2, top + 0.5, z1 + 0.1], 0.4, 0.01);
  wire(wg, [P1.x, P1.y2 + 0.15, P1.z], [x1 + 0.1, top + 1.2, -1.6], 0.35, 0.01);
  wire(wg, [P1.x, P1.y2 + 0.15, P1.z - 0.4], [3.5, 5.3 + SW, -5.4], 0.35, 0.01);
  wire(wg, [P3.x, P3.y2 + 0.15, P3.z], [-6.6, 6.65 + SW, 0.8], 0.5, 0.01);
  scene.add(wg);
  register(wg, 'street');

  // 路牌
  stopSign(g, 5.35, 3.15, 0);
  curveMirror(g, 5.05, 4.28, -Math.PI * 0.72);
  const nameSign = labelTex('栄町三丁目', 512, 160, { bg: '#2b6fc4', fg: '#fff', size: 80, sub: 'SAKAE-CHO 3', subSize: 34, radius: 10, border: '#fff' });
  signPole(g, -6.0, 4.5, 0, nameSign, 0.9, 0.28, 2.3);
  const park = labelTex('P', 160, 160, { bg: '#2b6fc4', fg: '#fff', size: 110, sub: '24h', subSize: 34, radius: 14, border: '#fff' });
  signPole(g, -3.65, 2.2, 0, park, 0.42, 0.42, 1.85);
  const ped = canvasTex(160, 160, (c, w, h) => {
    c.fillStyle = '#2b6fc4'; rrect(c, 0, 0, w, h, 14); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(80, 14); c.lineTo(146, 140); c.lineTo(14, 140); c.closePath(); c.fill();
    c.fillStyle = '#2b6fc4'; c.beginPath(); c.arc(80, 70, 9, 0, 7); c.fill();
    c.strokeStyle = '#2b6fc4'; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(80, 82); c.lineTo(80, 108); c.moveTo(80, 90); c.lineTo(62, 102); c.moveTo(80, 90); c.lineTo(98, 100); c.moveTo(80, 108); c.lineTo(66, 128); c.moveTo(80, 108); c.lineTo(96, 126); c.stroke();
  });
  signPole(g, 1.95, 4.55, 0, ped, 0.44, 0.44, 2.0);

  // 街角护栏
  const arc = [], cx = 4.5, cz = 3.6, R = 1.15;
  arc.push([4.2, 4.75], [4.5, 4.75]);
  for (let i = 1; i < 8; i++) { const a = Math.PI / 2 - (i / 8) * Math.PI / 2; arc.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); }
  arc.push([5.65, 3.6], [5.65, 3.25]);
  guardrail(g, arc);

  // 植物
  tree(g, -7.4, 3.5, 1.0);
  bush(g, -5.95, 1.1, 0.5);
  bush(g, 4.3, -4.9, 2.4);
  pot(g, -5.8, 2.0, '#d97a5a'); pot(g, -5.8, 2.6, '#5aa0d9');
  pot(g, -3.55, 0.75, '#e0a050');

  // 巷道小物
  const al = group(-4.75, SW, 0);
  box(al, 0.5, 0.45, 0.4, 0.5, 0, -3.5, T('#c9a06a', 0.45));
  box(al, 0.4, 0.3, 0.35, 0.6, 0.45, -3.5, T('#d9b27a', 0.45));
  cyl(al, 0.2, 0.2, 0.5, -0.6, 0, -2.5, T('#4a8bd8', 0.45), 12);
  cyl(al, 0.2, 0.2, 0.5, -0.4, 0, -4.3, T('#e8708a', 0.45), 12);
  stopSign(al, 0.7, 1.5, 0);
  g.add(al);

  scene.add(g);
  register(g, 'street');
  // 公告栏 / 贩卖机排列已含于 g；公告栏单独放在公寓前
  const ng = group();
  noticeBoard(ng, -6.3, 3.65, 0.0);
  scene.add(ng);
  register(ng, 'street');
  ng.position.set(-0.0, 0, 0);
}
