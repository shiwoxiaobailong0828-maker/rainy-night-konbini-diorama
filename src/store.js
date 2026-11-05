// 便利店：外壳、玻璃、自动门、雨棚、招牌 + 丰富的店内陈设
import * as THREE from 'three';
import { gradientMap, T, G, GT, box, cyl, sph, plane, flat, group, rod, canvasTex, labelTex, neonTex, FONT, rrect, rnd, rr, pick } from './utils.js';
import { register } from './intro.js';
import { SW } from './world.js';

export const STORE = { x0: -3.9, x1: 3.1, z0: -4.5, z1: 0.5, top: 3.3 };
const t = 0.14;                // 墙厚
const FY = SW + 0.02;          // 店内地面高度
export const roofMats = [];    // 屋顶材质（俯视时淡出，类似"娃娃屋"剖面）
export const roofRef = { group: null, extras: [] };
export const doors = { left: null, right: null, lx: 0, rx: 0 };
export const storeLights = [];

// ---------- 贴图 ----------
function glassTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(170,205,255,0.07)'; ctx.fillRect(0, 0, w, h);
    // 斜向反光带
    ctx.save(); ctx.translate(w * 0.5, h * 0.5); ctx.rotate(0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(-w * 0.9, -h * 0.16, w * 1.8, h * 0.13);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-w * 0.9, h * 0.04, w * 1.8, h * 0.05);
    ctx.restore();
    // 雨水滑落的痕迹
    for (let i = 0; i < 34; i++) {
      const x = rnd() * w, y = rnd() * h * 0.75, len = 40 + rnd() * 170;
      ctx.strokeStyle = `rgba(225,240,255,${0.16 + rnd() * 0.2})`;
      ctx.lineWidth = 1.4 + rnd() * 1.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 3, y + len * 0.3, x - 3, y + len * 0.6, x + 1, y + len); ctx.stroke();
      ctx.fillStyle = 'rgba(235,245,255,0.5)';
      ctx.beginPath(); ctx.ellipse(x + 1, y + len, 3.2, 4.8, 0, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(235,245,255,${0.18 + rnd() * 0.25})`;
      ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 3, 0, 7); ctx.fill();
    }
  });
}

function signTex(wide) {
  const W = wide ? 2048 : 900, H = 230;
  return canvasTex(W, H, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b3aa0'); g.addColorStop(1, '#1b2670');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#25c9b8'; c.fillRect(0, h * 0.82, w, h * 0.12);
    c.fillStyle = '#ffd23f'; c.fillRect(0, h * 0.94, w, h * 0.06);
    // 月牙标志
    const mx = wide ? 190 : 120, my = h * 0.46, mr = h * 0.3;
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.fillStyle = '#2b3aa0'; c.beginPath(); c.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.86, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(mx + mr * 0.95, my + mr * 0.55, mr * 0.12, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.textBaseline = 'middle';
    if (wide) {
      c.textAlign = 'left';
      c.font = `900 120px ${FONT}`; c.fillText('LUNA MART', 330, h * 0.42);
      c.font = `800 52px ${FONT}`; c.fillStyle = '#bfe9ff'; c.fillText('ルナマート  ─  雨の夜も、あなたの隣に', 335, h * 0.72);
      // 24h 胶囊
      c.fillStyle = '#ffd23f'; rrect(c, w - 520, h * 0.18, 220, h * 0.5, 40); c.fill();
      c.fillStyle = '#1b2670'; c.textAlign = 'center'; c.font = `900 96px ${FONT}`; c.fillText('24h', w - 410, h * 0.45);
      c.fillStyle = '#fff'; c.font = `800 62px ${FONT}`; c.fillText('営業中', w - 170, h * 0.45);
      c.fillStyle = '#ff6fb5'; c.font = `800 40px ${FONT}`; c.fillText('おにぎり・おでん・コーヒー', w - 330, h * 0.74);
    } else {
      c.textAlign = 'left';
      c.font = `900 84px ${FONT}`; c.fillText('LUNA', 220, h * 0.36);
      c.font = `900 70px ${FONT}`; c.fillText('MART', 220, h * 0.68);
      c.fillStyle = '#ffd23f'; rrect(c, w - 270, h * 0.2, 220, h * 0.48, 36); c.fill();
      c.fillStyle = '#1b2670'; c.textAlign = 'center'; c.font = `900 100px ${FONT}`; c.fillText('24h', w - 160, h * 0.46);
    }
  });
}

function awningTex() {
  return canvasTex(256, 64, (c, w, h) => {
    const cols = ['#2a3a9a', '#f6f3ff', '#2a3a9a', '#f6f3ff', '#25c9b8', '#f6f3ff'];
    const sw = w / cols.length;
    cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * sw, 0, sw + 1, h); });
  }, [4, 1]);
}

function checkerTex() {
  return canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#fff2cf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f0dcad'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2);
    c.strokeStyle = 'rgba(180,145,95,0.35)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h);
  }, [7.2, 5.0]);
}

function popTex(text, bg, fg, sub) {
  return canvasTex(256, 160, (c, w, h) => {
    c.fillStyle = bg; rrect(c, 4, 4, w - 8, h - 8, 18); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 6; rrect(c, 14, 14, w - 28, h - 28, 12); c.stroke();
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${text.length > 4 ? 46 : 62}px ${FONT}`;
    c.fillText(text, w / 2, sub ? h * 0.42 : h * 0.52);
    if (sub) { c.font = `800 30px ${FONT}`; c.fillText(sub, w / 2, h * 0.76); }
  });
}

// 商品包装色板
const PROD = ['#ff5a5f', '#ffb627', '#4cc9f0', '#7bd389', '#f78fb3', '#9b7bff', '#ffd93d', '#ff8a3d', '#3fd0c9', '#e85d9b', '#6fa8ff', '#f4f1de', '#ff7b7b', '#a4de6c'];

// ---------- 小工具 ----------
function wallBox(g, w, h, d, x, y, z, outer, inner, innerFace) {
  const mats = Array(6).fill(outer);
  mats[{ '+x': 0, '-x': 1, '+z': 4, '-z': 5 }[innerFace]] = inner;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(x, y + h / 2, z);
  g.add(m);
  return m;
}

function instBoxes(count, mat) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, count);
  im.frustumCulled = false;
  return im;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
function setInst(im, i, x, y, z, sx, sy, sz, color) {
  _p.set(x, y, z); _s.set(sx, sy, sz);
  _m.compose(_p, _q.identity(), _s);
  im.setMatrixAt(i, _m);
  im.setColorAt(i, _c.set(color));
}

const glass = () => {
  const m = new THREE.MeshBasicMaterial({ map: glassTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  return m;
};

// =====================================================================
export function buildStoreShell(scene) {
  const g = group();
  const { x0, x1, z0, z1, top } = STORE;
  const wOut = T('#ece9f8', 0.28);
  const wIn = T('#ffecc8', 0.48);
  const dado = T('#343a86', 0.3);
  const metal = T('#b4bcdc', 0.35);
  const cx = (x0 + x1) / 2, W = x1 - x0;
  const H = top - SW;

  // 转角立柱
  const pil = T('#d8d4ec', 0.3);
  for (const [px, pz] of [[x0, z1], [x1, z1], [x0, z0], [x1, z0]]) box(g, 0.3, H, 0.3, px, SW, pz, pil);

  // ---- 前墙 (z = z1)，朝向 +z 为外 ----
  wallBox(g, 4.9, 0.45, t, -1.3, SW, z1, dado, wIn, '-z');                       // 窗下
  wallBox(g, 0.45, H, t, 2.875, SW, z1, wOut, wIn, '-z');                         // 门右侧墙
  wallBox(g, W, 0.45, t, cx, 2.85, z1, wOut, wIn, '-z');                          // 上部横梁
  box(g, W, 0.07, 0.06, cx, 2.85, z1 + 0.08, G('#25c9b8', 1.3));                  // 青色饰线
  // 窗框竖梃
  for (const x of [-2.45, -1.25, -0.05]) box(g, 0.06, 2.25, 0.08, x, 0.6, z1, metal);
  box(g, 4.9, 0.06, 0.1, -1.3, 0.58, z1, metal);
  box(g, 0.12, 2.25, 0.1, 1.1, 0.6, z1, metal);
  box(g, 0.12, 2.25, 0.1, 2.7, 0.6, z1, metal);
  box(g, 1.7, 0.07, 0.1, 1.9, 2.78, z1, metal);

  // ---- 东墙 (x = x1)，朝向 +x 为外 ----
  wallBox(g, t, H, 2.95, x1, SW, -3.025, wOut, wIn, '-x');
  wallBox(g, t, 0.6, 2.05, x1, SW, -0.525, dado, wIn, '-x');
  wallBox(g, t, 0.8, 2.05, x1, 2.5, -0.525, wOut, wIn, '-x');
  box(g, 0.1, 1.75, 0.06, x1, 0.75, -0.6, metal);
  box(g, 0.1, 0.06, 2.05, x1, 0.73, -0.525, metal);
  box(g, t + 0.04, 0.45, 2.95, x1, SW, -3.025, dado);

  // ---- 西墙 (x = x0)，朝向 -x 为外（面向巷道）----
  wallBox(g, t, H, 1.1, x0, SW, -3.95, wOut, wIn, '+x');
  wallBox(g, t, H, 2.1, x0, SW, -0.55, wOut, wIn, '+x');
  wallBox(g, t, 0.75, 1.8, x0, SW, -2.5, dado, wIn, '+x');
  wallBox(g, t, 0.9, 1.8, x0, 2.4, -2.5, wOut, wIn, '+x');
  box(g, 0.1, 1.5, 0.06, x0, 0.9, -2.5, metal);
  box(g, t + 0.04, 0.45, 1.1, x0, SW, -3.95, dado);
  box(g, t + 0.04, 0.45, 2.1, x0, SW, -0.55, dado);

  // ---- 后墙 (z = z0)，朝向 -z 为外 ----
  wallBox(g, W, H, t, cx, SW, z0, wOut, wIn, '+z');
  box(g, W, 0.45, t + 0.04, cx, SW, z0, dado);

  // ---- 玻璃 ----
  const gm = glass();
  const gl = (w, h, x, y, z, ry) => { const p = plane(g, w, h, x, y, z, gm, ry); p.userData.noOutline = true; p.renderOrder = 2; return p; };
  gl(4.7, 2.25, -1.3, 0.6 + 1.125, z1, 0);
  gl(1.9, 1.75, x1, 0.75 + 0.875, -0.6, Math.PI / 2);
  gl(1.8, 1.5, x0, 0.9 + 0.75, -2.5, -Math.PI / 2);

  // ---- 自动门 ----
  const mkPanel = (cxp, zp) => {
    const p = group(cxp, 0, zp);
    const pw = 0.72, ph = 2.12;
    const gp = plane(p, pw - 0.1, ph - 0.1, 0, SW + 0.04 + ph / 2, 0, gm);
    gp.userData.noOutline = true;
    const fr = T('#c8cfea', 0.4);
    box(p, pw, 0.06, 0.07, 0, SW + 0.04, 0, fr);
    box(p, pw, 0.06, 0.07, 0, SW + 0.04 + ph - 0.06, 0, fr);
    box(p, 0.06, ph, 0.07, -pw / 2 + 0.03, SW + 0.04, 0, fr);
    box(p, 0.06, ph, 0.07, pw / 2 - 0.03, SW + 0.04, 0, fr);
    box(p, 0.03, 0.6, 0.05, cxp < 2 ? 0.25 : -0.25, 0.95, 0.07, T('#8e96b8', 0.3));
    return p;
  };
  doors.left = mkPanel(1.51, z1 - 0.1);
  doors.right = mkPanel(2.29, z1 + 0.1);
  doors.lx = 1.51; doors.rx = 2.29;
  g.add(doors.left, doors.right);
  // 门体感应器 + 贴纸
  box(g, 0.5, 0.14, 0.12, 1.9, 2.62, z1 + 0.1, T('#dfe3f5', 0.4));
  sph(g, 0.03, 1.9, 2.62, z1 + 0.17, G('#ff4d4d', 2));
  const door1 = plane(g, 0.5, 0.2, 1.9, 2.45, z1 + 0.08, new THREE.MeshBasicMaterial({ map: labelTex('自動ドア', 256, 100, { bg: '#fff', fg: '#222', size: 54, radius: 14 }) }));

  scene.add(g);
  register(g, 'shell');

  // ---- 屋顶（与屋檐、顶部装饰分开，便于淡出）----
  const g2 = group();
  const mk = (hex, emi) => { const m = T(hex, emi, { unique: true }); roofMats.push(m); return m; };
  const roofSide = mk('#8e93b8', 0.25), roofTop = mk('#767ca3', 0.25), roofBot = mk('#fff4dc', 0.7);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.35, 0.16, (z1 - z0) + 0.5), [roofSide, roofSide, roofTop, roofBot, roofSide, roofSide]);
  slab.position.set(cx, top + 0.08, (z0 + z1) / 2 + 0.1);
  g2.add(slab);
  const par = mk('#a6abcf', 0.3);
  box(g2, W + 0.35, 0.14, 0.1, cx, top + 0.16, z0 - 0.1, par);
  box(g2, 0.1, 0.14, (z1 - z0) + 0.5, x0 - 0.12, top + 0.16, (z0 + z1) / 2 + 0.1, par);
  box(g2, 0.1, 0.14, (z1 - z0) + 0.5, x1 + 0.12, top + 0.16, (z0 + z1) / 2 + 0.1, par);
  scene.add(g2);
  register(g2, 'top', false);
  roofRef.group = g2;
}

// =====================================================================
export function buildStoreTop(scene) {
  const g = group();
  const { x0, x1, z0, z1, top } = STORE;
  const cx = (x0 + x1) / 2, W = x1 - x0;

  // 立面招牌（前 + 东侧转角）
  const front = new THREE.MeshBasicMaterial({ map: signTex(true), color: new THREE.Color(1.04, 1.04, 1.04) });
  const east = new THREE.MeshBasicMaterial({ map: signTex(false), color: new THREE.Color(1.04, 1.04, 1.04) });
  const body = T('#27318a', 0.35);
  const fm = new THREE.Mesh(new THREE.BoxGeometry(W + 0.36, 0.9, 0.2), [body, body, body, body, front, body]);
  fm.position.set(cx, top + 0.45 + 0.3, z1 + 0.1);
  g.add(fm);
  const em = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 2.2), [east, body, body, body, body, body]);
  em.position.set(x1 + 0.16, top + 0.45 + 0.3, z1 - 1.0);
  g.add(em);
  // 招牌上沿发光条
  box(g, W + 0.4, 0.05, 0.24, cx, top + 1.2, z1 + 0.1, G('#ffe08a', 1.25));
  box(g, 0.24, 0.05, 2.24, x1 + 0.16, top + 1.2, z1 - 1.0, G('#ffe08a', 1.25));

  // 屋檐雨棚（略微前倾）
  const at = awningTex();
  const atTop = new THREE.MeshToonMaterial({ map: at, gradientMap: gradientMap, emissive: new THREE.Color('#ffffff').multiplyScalar(0.28), emissiveMap: at });
  const atBot = T('#fff6e2', 0.42);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.07, 1.35), [atBot, atBot, atTop, atBot, atBot, atBot]);
  aw.position.set(cx, 3.02, z1 + 0.65);
  aw.rotation.x = 0.13;
  g.add(aw);
  const val = T('#2a3a9a', 0.35);
  const v = box(g, W + 0.4, 0.2, 0.05, cx, 2.64, z1 + 1.3, val);
  v.rotation.x = 0.0;
  for (const x of [-3.5, -1.4, 0.7, 2.8]) rod(g, [x, 2.95, z1 + 0.1], [x, 2.8, z1 + 1.15], 0.025, T('#9aa2c8', 0.3));
  // 排水落水管
  cyl(g, 0.05, 0.05, 3.2, x1 + 0.2, SW, z0 + 0.1, T('#c4c9e4', 0.3));
  cyl(g, 0.05, 0.05, 3.3, x0 - 0.2, SW, z0 + 0.1, T('#c4c9e4', 0.3));

  // 屋顶设备：空调外机、通风管
  const unit = (x, z, ry) => {
    const u = group(x, top + 0.24, z, ry);
    box(u, 0.9, 0.7, 0.4, 0, 0, 0, T('#e4e8f6', 0.3));
    const fan = cyl(u, 0.26, 0.26, 0.03, 0, 0.35 - 0.35, 0.21, T('#4a5078', 0.2), 20); fan.rotation.x = Math.PI / 2; fan.position.set(-0.08, 0.35, 0.21);
    cyl(u, 0.08, 0.08, 0.03, -0.08, 0.35, 0.225, T('#2c3156'), 12).rotation.x = Math.PI / 2;
    box(u, 0.12, 0.5, 0.03, 0.34, 0.1, 0.2, T('#8f97bd', 0.2));
    roofRef.extras.push(u);
    return u;
  };
  g.add(unit(-2.4, -3.2, 0), unit(-1.2, -3.2, 0), unit(1.6, -3.4, 0));
  const v1 = cyl(g, 0.12, 0.12, 0.7, 2.6, top + 0.24, -3.9, T('#c7cce6', 0.3));
  const v2 = cyl(g, 0.2, 0.12, 0.12, 2.6, top + 0.94, -3.9, T('#9ea6cc', 0.3));
  // 卫星天线
  const d1 = cyl(g, 0.02, 0.02, 0.5, -3.2, top + 0.24, -1.8, T('#aab2d6'));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), T('#e4e8f6', 0.35));
  dish.position.set(-3.2, top + 0.85, -1.8); dish.rotation.set(-1.0, 0.5, 0); g.add(dish);
  roofRef.extras.push(v1, v2, d1, dish);

  scene.add(g);
  register(g, 'top');
}

// =====================================================================
export function buildStoreInterior(scene) {
  const g = group();
  const topCeilingGroup = group();
  const { x0, x1, z0, z1, top } = STORE;
  const ix0 = x0 + 0.07, ix1 = x1 - 0.07, iz0 = z0 + 0.07, iz1 = z1 - 0.07;
  const ceilY = top;

  // 地板 + 地垫 + 踢脚线（整体铺设）
  const floorG = group();
  flat(floorG, ix1 - ix0, iz1 - iz0, (ix0 + ix1) / 2, FY, (iz0 + iz1) / 2, T('#ffffff', 0.50, { map: checkerTex(), unique: true }));
  box(floorG, 1.4, 0.015, 0.7, 1.9, FY, 0.0, T('#3b4286', 0.3));
  const trim = T('#25c9b8', 0.45);
  box(floorG, ix1 - ix0, 0.1, 0.02, (ix0 + ix1) / 2, FY, iz0 + 0.02, trim);
  g.add(floorG);

  // ---- 顶灯（LED 灯板，随屋顶阶段安装）----
  const led = G('#fff6dc', 1.15);
  const ledG = group();
  for (const z of [-3.4, -2.0, -0.6]) for (const x of [-2.6, -0.4, 1.8]) {
    box(ledG, 1.25, 0.05, 0.28, x, ceilY - 0.06, z, led);
    box(ledG, 1.35, 0.025, 0.36, x, ceilY - 0.025, z, T('#d9deef', 0.35));
  }
  topCeilingGroup.add(ledG);
  roofRef.extras.push(ledG);

  // ---- 后墙冷饮柜 ×5 ----
  const frameM = T('#444a72', 0.35);
  const glowM = G('#e6f8ff', 0.92);
  const bottleM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const headerCols = ['#ff5a5f', '#4cc9f0', '#7bd389', '#ffb627', '#9b7bff'];
  const dz = iz0 + 0.3;
  for (let i = 0; i < 5; i++) {
    const cx = -3.3 + i * 1.05;
    const cg = group(cx, 0, dz);
    box(cg, 1.0, 2.25, 0.5, 0, FY, 0, frameM);
    box(cg, 0.9, 2.05, 0.04, 0, FY + 0.1, 0.24, glowM);   // 发光内胆面板（冷白）
    // 隔板 + 饮料
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), bottleM, 5 * 8);
    im.frustumCulled = false;
    let n = 0;
    for (let r = 0; r < 5; r++) {
      const y = FY + 0.25 + r * 0.4;
      box(cg, 0.9, 0.025, 0.4, 0, y, 0.06, T('#9aa3c8', 0.4));
      for (let k = 0; k < 8; k++) {
        const isCan = rnd() < 0.4;
        const bh = isCan ? 0.14 : 0.24, br = isCan ? 0.034 : 0.036;
        setInst(im, n++, -0.37 + k * 0.105, y + 0.0125 + bh / 2, 0.2, br * 2, bh, br * 2, pick(PROD));
      }
    }
    cg.add(im);
    // 顶部标题灯箱
    box(cg, 1.0, 0.16, 0.52, 0, FY + 2.25, 0, G(headerCols[i], 1.2));
    // 玻璃门（带细框）
    const gp = plane(cg, 0.92, 2.05, 0, FY + 1.12, 0.26, glass());
    gp.userData.noOutline = true;
    box(cg, 0.04, 2.1, 0.04, -0.5, FY, 0.26, T('#cdd3ee', 0.4));
    box(cg, 0.025, 0.7, 0.04, 0.4, FY + 0.75, 0.29, T('#9aa3c8', 0.4));
    g.add(cg);
  }
  // 冷饮柜上方横幅 & 时钟
  const banner = new THREE.MeshBasicMaterial({ map: labelTex('COLD DRINKS  ·  ドリンク  ·  お茶  ·  コーヒー  ·  ジュース', 1700, 130, { bg: '#25c9b8', fg: '#ffffff', size: 70, radius: 22 }), color: new THREE.Color(1.1, 1.1, 1.1) });
  plane(g, 5.3, 0.4, -1.05, FY + 2.65, iz0 + 0.03, banner);
  const clock = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
    c.strokeStyle = '#2b3160'; c.lineWidth = 6; c.stroke();
    c.lineCap = 'round'; c.lineWidth = 7; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 28); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(88, 74); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 2, 4, 4); }
  });
  const ck = plane(g, 0.42, 0.42, 2.15, FY + 2.7, iz0 + 0.03, new THREE.MeshBasicMaterial({ map: clock, transparent: true }));

  // ---- 后右：冰淇淋冷冻柜 ----
  {
    const fg = group(2.25, 0, iz0 + 0.3);
    box(fg, 1.4, 0.9, 0.55, 0, FY, 0, T('#e8ecfb', 0.45));
    box(fg, 1.36, 0.04, 0.5, 0, FY + 0.9, 0, T('#7fd6ff', 0.6));
    const gl2 = plane(fg, 1.3, 0.48, 0, FY + 1.0, 0.1, glass()); gl2.rotation.x = -0.5; gl2.userData.noOutline = true;
    const im = instBoxes(12, new THREE.MeshToonMaterial({ gradientMap: gradientMap, emissive: new THREE.Color('#ffffff').multiplyScalar(0.2) }));
    for (let k = 0; k < 12; k++) setInst(im, k, -0.58 + (k % 6) * 0.23, FY + 0.88 + (k < 6 ? 0.0 : 0.0), -0.1 + (k < 6 ? 0.0 : 0.15), 0.14, 0.08, 0.1, pick(PROD));
    fg.add(im);
    box(fg, 1.3, 0.32, 0.12, 0, FY + 1.2, -0.18, G('#7fd6ff', 1.2));
    const ice = new THREE.MeshBasicMaterial({ map: labelTex('アイス ICE CREAM', 512, 90, { bg: '#ff6fb5', fg: '#fff', size: 46, radius: 16 }) });
    plane(fg, 1.3, 0.3, 0, FY + 1.7, 0.0 - 0.2 + 0.28, ice).position.z = -0.0;
    g.add(fg);
  }

  // ---- 中部货架（3 排，两面陈列）----
  const prodMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap, emissive: new THREE.Color('#ffffff').multiplyScalar(0.12) });
  const shelfM = T('#e7ebf8', 0.45), shelfBack = T('#f5d36a', 0.45);
  const gz0 = -3.45, gz1 = -1.05;
  const popTexs = [
    popTex('新発売', '#ff5a5f', '#fff', 'NEW!'), popTex('お買い得', '#ffb627', '#3a2a10', 'SPECIAL'),
    popTex('雨の日', '#4cc9f0', '#fff', '傘をどうぞ'), popTex('おでん', '#c2693a', '#fff', '熱々あります'),
    popTex('今夜限定', '#9b7bff', '#fff'), popTex('スイーツ', '#f78fb3', '#fff', 'DESSERT'),
  ];
  [-2.4, -0.9, 0.55].forEach((gx, gi) => {
    const sg = group(gx, 0, 0);
    const len = gz1 - gz0, zc = (gz0 + gz1) / 2;
    box(sg, 0.55, 0.14, len, 0, FY, zc, T('#6c75b0', 0.35));          // 底座
    box(sg, 0.05, 1.5, len, 0, FY + 0.1, zc, shelfBack);               // 中间隔板（黄色）
    for (let l = 0; l < 3; l++) for (const s of [-1, 1]) box(sg, 0.24, 0.025, len, s * 0.145, FY + 0.28 + l * 0.43, zc, shelfM);
    box(sg, 0.55, 0.06, len, 0, FY + 1.6, zc, T('#e7ebf8', 0.4));
    // 立柱
    for (const z of [gz0, gz1]) for (const s of [-1, 1]) box(sg, 0.03, 1.5, 0.03, s * 0.26, FY + 0.1, z, T('#aab2d6', 0.4));
    // 商品
    const im = instBoxes(2 * 3 * 13, prodMat);
    let n = 0;
    for (const s of [-1, 1]) for (let l = 0; l < 3; l++) {
      for (let k = 0; k < 13; k++) {
        const w = rr(0.1, 0.14), h = rr(0.2, 0.34);
        setInst(im, n++, s * 0.15, FY + 0.31 + l * 0.43 + h / 2, gz0 + 0.1 + k * 0.17, 0.2, h, w, pick(PROD));
      }
    }
    sg.add(im);
    // 端架促销牌
    const pm = new THREE.MeshBasicMaterial({ map: popTexs[gi], transparent: true, side: THREE.DoubleSide });
    plane(sg, 0.5, 0.31, 0, FY + 1.82, gz1 + 0.02, pm);
    const lm = new THREE.MeshBasicMaterial({ map: popTexs[gi + 3], transparent: true, side: THREE.DoubleSide });
    plane(sg, 0.5, 0.31, 0, FY + 1.82, gz0 - 0.02, lm);
    rod(sg, [-0.2, FY + 1.6, gz1], [-0.2, FY + 1.95, gz1], 0.012, T('#aab2d6'));
    rod(sg, [0.2, FY + 1.6, gz1], [0.2, FY + 1.95, gz1], 0.012, T('#aab2d6'));
    g.add(sg);
  });

  // ---- 西墙壁挂货架（泡面/零食）----
  {
    const wg = group(ix0 + 0.18, 0, -2.5);
    box(wg, 0.06, 2.0, 1.75, -0.14, FY, 0, T('#aab2d6', 0.45));
    const im = instBoxes(5 * 9, prodMat);
    let n = 0;
    for (let l = 0; l < 5; l++) {
      box(wg, 0.3, 0.025, 1.75, 0, FY + 0.15 + l * 0.38, 0, shelfM);
      for (let k = 0; k < 9; k++) setInst(im, n++, 0.0, FY + 0.18 + l * 0.38 + 0.15, -0.8 + k * 0.2, 0.22, rr(0.22, 0.3), 0.15, pick(PROD));
    }
    wg.add(im);
    g.add(wg);
  }

  // ---- 收银台（后右）----
  {
    const cg = group(2.1, 0, -2.75);
    const len = 1.7;
    box(cg, 0.8, 1.0, len, 0, FY, 0, T('#f2f4fc', 0.5));
    box(cg, 0.85, 0.06, len + 0.05, 0, FY + 1.0, 0, T('#ffffff', 0.6));
    box(cg, 0.04, 0.8, len - 0.1, -0.41, FY + 0.1, 0, T('#25c9b8', 0.6));
    // 收银机
    for (const z of [-0.45, 0.35]) {
      box(cg, 0.3, 0.12, 0.34, 0.0, FY + 1.06, z, T('#3b4062', 0.3));
      const sc = box(cg, 0.04, 0.22, 0.28, 0.02, FY + 1.17, z, G('#8cf0ff', 1.3)); sc.rotation.z = -0.3;
    }
    // 热食柜（炸物）
    box(cg, 0.5, 0.06, 0.5, -0.05, FY + 1.06, 0.7, T('#e4e8f6', 0.5));
    const gc = box(cg, 0.46, 0.34, 0.46, -0.05, FY + 1.12, 0.7, G('#ffc66b', 0.55, { transparent: true, opacity: 0.35, depthWrite: false })); gc.userData.noOutline = true;
    for (let k = 0; k < 6; k++) cyl(cg, 0.03, 0.03, 0.14, -0.2 + (k % 3) * 0.13, FY + 1.12, 0.6 + Math.floor(k / 3) * 0.16, T('#e69b3a', 0.5), 8).rotation.z = 1.2;
    // 关东煮锅
    cyl(cg, 0.24, 0.24, 0.16, 0.0, FY + 1.06, -0.1 + 0.05, T('#d7dcef', 0.5), 20);
    cyl(cg, 0.2, 0.2, 0.02, 0.0, FY + 1.2, -0.05, T('#c98b4a', 0.7), 20);
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; sph(cg, 0.045, Math.cos(a) * 0.1, FY + 1.23, -0.05 + Math.sin(a) * 0.1, T(pick(['#f7efd8', '#b9733c', '#f4d9a0']), 0.5), 8); }
    // 糖果架、捐款箱
    box(cg, 0.2, 0.2, 0.2, 0.05, FY + 1.06, -0.8 + 0.0, T('#ff6fb5', 0.5));
    box(cg, 0.12, 0.16, 0.12, -0.2, FY + 1.06, -0.75, T('#ffb627', 0.5));
    // 中华包蒸箱（肉まん・あんまん）
    box(cg, 0.36, 0.48, 0.34, 0.02, FY + 1.06, -0.38, G('#fff2d6', 0.45, { transparent: true, opacity: 0.4, depthWrite: false })).userData.noOutline = true;
    box(cg, 0.38, 0.07, 0.36, 0.02, FY + 1.54, -0.38, T('#e03b3b', 0.55));
    for (let r = 0; r < 3; r++) {
      box(cg, 0.32, 0.015, 0.3, 0.02, FY + 1.15 + r * 0.13, -0.38, T('#c8cfee', 0.4));
      for (let b = 0; b < 4; b++) sph(cg, 0.04, -0.05 + (b % 2) * 0.12, FY + 1.19 + r * 0.13, -0.44 + Math.floor(b / 2) * 0.12, T(b === 3 ? '#f6d479' : '#fff8ee', 0.55), 8).scale.y = 0.7;
    }
    // 现磨咖啡机（收银台最北端延伸台）
    box(cg, 0.65, 1.0, 0.55, 0.08, FY, -1.12, T('#3a3f62', 0.35));
    box(cg, 0.45, 0.62, 0.42, 0.08, FY + 1.0, -1.12, T('#242846', 0.3));
    box(cg, 0.46, 0.14, 0.44, 0.08, FY + 1.62, -1.12, G('#ffb86b', 1.05));
    cyl(cg, 0.04, 0.03, 0.1, -0.06, FY + 1.02, -1.02, T('#ffffff', 0.6), 10);
    cyl(cg, 0.04, 0.03, 0.1, 0.08, FY + 1.02, -1.02, T('#ffffff', 0.6), 10);
    g.add(cg);
    // 后墙烟架 + 商用微波炉
    const cig = canvasTex(256, 160, (c, w, h) => {
      c.fillStyle = '#2d3156'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 6; r++) for (let k = 0; k < 14; k++) { c.fillStyle = pick(PROD); c.fillRect(8 + k * 17, 8 + r * 24, 13, 19); }
    });
    const cp = plane(g, 1.5, 0.9, ix1 - 0.02, FY + 1.9, -2.75, new THREE.MeshBasicMaterial({ map: cig, color: new THREE.Color(0.95, 0.95, 0.95) }), -Math.PI / 2);
    box(g, 0.28, 1.1, 1.6, ix1 - 0.14, FY, -2.75, T('#ecefff', 0.4));
    for (const mz of [-2.35, -3.15]) {
      box(g, 0.26, 0.28, 0.46, ix1 - 0.14, FY + 1.1, mz, T('#f4f6ff', 0.45));
      box(g, 0.02, 0.18, 0.28, ix1 - 0.275, FY + 1.15, mz - 0.04, G('#ffe29a', 0.95));
    }
  }

  // ---- 窗边座位（用餐区）+ 杂志书刊架 + 窗边暖色球形吊灯 ----
  {
    const eg = group(-2.15, 0, 0.02);
    box(eg, 2.7, 0.05, 0.4, 0, FY + 0.98, 0.0, T('#f0e0c0', 0.42));
    for (const x of [-1.25, 0, 1.25]) box(eg, 0.05, 0.98, 0.3, x, FY, 0, T('#aab2d6', 0.35));
    for (const x of [-1.05, -0.35, 0.35, 1.05]) {
      cyl(eg, 0.02, 0.02, 0.62, x, FY, -0.48, T('#9aa2c8', 0.35), 8);
      cyl(eg, 0.15, 0.15, 0.07, x, FY + 0.62, -0.48, T(pick(['#ff6a6a', '#ffb627', '#4cc9f0', '#7bd389']), 0.45), 16);
      cyl(eg, 0.1, 0.1, 0.02, x, FY, -0.48, T('#9aa2c8', 0.35), 12);
    }
    // 桌上物品：杯面、饮料、便当盒、纸巾
    const cup = (x, c) => { cyl(eg, 0.085, 0.06, 0.12, x, FY + 1.03, 0.0, T(c, 0.5), 12); cyl(eg, 0.088, 0.088, 0.015, x, FY + 1.15, 0.0, T('#fff', 0.55), 12); };
    cup(-0.95, '#ff5a5f'); cup(-0.45, '#ffb627');
    cyl(eg, 0.035, 0.035, 0.2, 0.15, FY + 1.03, 0.05, T('#4cc9f0', 0.55), 10);
    cyl(eg, 0.04, 0.04, 0.1, 0.45, FY + 1.03, -0.05, T('#8b5a3c', 0.5), 10);
    box(eg, 0.22, 0.045, 0.16, 0.85, FY + 1.03, 0.0, T('#2d3156', 0.35));
    box(eg, 0.18, 0.02, 0.12, 0.85, FY + 1.075, 0.0, T('#ff9b54', 0.55));
    // 窗边暖色小吊灯 ×4（随顶部阶段安装）
    const pendG = group(-2.15, 0, 0.02);
    for (const lx of [-1.05, -0.35, 0.35, 1.05]) {
      rod(pendG, [lx, ceilY - FY, -0.05], [lx, 2.25, -0.05], 0.008, T('#8f97bd', 0.3));
      cyl(pendG, 0.03, 0.09, 0.06, lx, 2.22, -0.05, T('#ffb627', 0.5), 12);
      sph(pendG, 0.065, lx, 2.18, -0.05, G('#ffe6a8', 1.2), 12);
    }
    topCeilingGroup.add(pendG);
    roofRef.extras.push(pendG);
    g.add(eg);

    // 杂志书刊架（低矮阶梯双面展示架，位于吧台右侧窗下，不遮挡大橱窗）
    const mg = group(0.05, 0, 0.04);
    box(mg, 1.12, 0.82, 0.34, 0, FY, 0, T('#f5e6c8', 0.45));
    box(mg, 1.14, 0.08, 0.36, 0, FY + 0.82, 0, T('#25c9b8', 0.55));
    for (const side of [-1, 1]) {
      for (let r = 0; r < 2; r++) {
        const sy = FY + 0.18 + r * 0.3;
        for (let k = 0; k < 7; k++) {
          const bk = box(mg, 0.13, 0.21, 0.025, -0.45 + k * 0.15, sy + 0.08, side * 0.16, T(pick(PROD), 0.55));
          bk.rotation.x = -side * 0.18;
        }
      }
    }
    g.add(mg);
  }

  // ---- 篮筐架（入口左）----
  {
    const bg = group(0.8, 0, 0.12);
    for (let k = 0; k < 4; k++) box(bg, 0.42, 0.14, 0.3, 0, FY + 0.06 + k * 0.1, 0, T('#ff5a5f', 0.6));
    box(bg, 0.46, 0.06, 0.34, 0, FY, 0, T('#c9cfea', 0.4));
    rod(bg, [-0.2, FY + 0.06, 0], [-0.2, FY + 1.0, 0.0], 0.015, T('#aab2d6'));
    g.add(bg);
  }
  // 雨伞架（店内入口右，卖透明伞）
  {
    const ug = group(2.8, 0, 0.1);
    box(ug, 0.28, 0.5, 0.28, 0, FY, 0, T('#e4e8f6', 0.5));
    for (let k = 0; k < 4; k++) {
      const u = cyl(ug, 0.012, 0.03, 0.75, -0.08 + k * 0.055, FY + 0.5, 0.0, T('#e6f5ff', 0.8), 8);
      u.rotation.z = (k - 1.5) * 0.04;
    }
    g.add(ug);
  }

  // ---- 促销挂牌（悬挂 POP，随顶部阶段安装）----
  const pops = [
    ['新商品', '#ff5a5f', -2.7, -0.7], ['お買い得', '#ffb627', -0.6, -0.6], ['雨の日セール', '#4cc9f0', 1.2, -0.4],
    ['ホット', '#ff8a3d', -1.5, -2.6], ['おにぎり', '#7bd389', 0.4, -2.6],
  ];
  const popAllG = group();
  pops.forEach(([tx, c, x, z]) => {
    const pm = new THREE.MeshBasicMaterial({ map: popTex(tx, c, c === '#ffb627' ? '#3a2a10' : '#fff'), transparent: true, side: THREE.DoubleSide });
    plane(popAllG, 0.62, 0.39, x, ceilY - 0.55, z, pm);
    rod(popAllG, [x - 0.2, ceilY - 0.06, z], [x - 0.2, ceilY - 0.37, z], 0.008, T('#ddd'));
    rod(popAllG, [x + 0.2, ceilY - 0.06, z], [x + 0.2, ceilY - 0.37, z], 0.008, T('#ddd'));
  });
  topCeilingGroup.add(popAllG);
  roofRef.extras.push(popAllG);

  // ---- ATM ----
  {
    const ag = group(ix0 + 0.35, 0, -0.55);
    box(ag, 0.5, 1.7, 0.55, 0, FY, 0, T('#3a73d6', 0.5));
    const scr = box(ag, 0.04, 0.35, 0.4, 0.27, FY + 1.25, 0, G('#9cf5ff', 1.3));
    box(ag, 0.22, 0.04, 0.3, 0.28, FY + 1.0, 0, T('#c8d2f8', 0.5));
    box(ag, 0.5, 0.14, 0.58, 0, FY + 1.7, 0, G('#4a8dff', 1.3));
    g.add(ag);
  }

  // ---- 立牌 ----
  {
    const sg = group(1.0, 0, -0.95, -0.3);
    box(sg, 0.55, 1.0, 0.04, 0, FY + 0.05, 0, T('#ffd23f', 0.6));
    const sp = plane(sg, 0.5, 0.9, 0, FY + 0.55, 0.03, new THREE.MeshBasicMaterial({ map: labelTex('おでん', 256, 460, { bg: '#c2411f', fg: '#fff', size: 96, sub: 'HOT!', subSize: 54, radius: 14 }) }));
    g.add(sg);
  }

  // ---- 室内光源（暖色）----
  const pl = (x, y, z, i) => { const l = new THREE.PointLight('#ffc878', i, 7.5, 1.6); l.position.set(x, y, z); scene.add(l); storeLights.push(l); };
  pl(-2.3, 2.7, -1.2, 1.5); pl(0.8, 2.7, -1.0, 1.5); pl(-0.8, 2.7, -3.2, 1.25); pl(2.3, 2.6, -3.0, 1.1);

  scene.add(g);
  register(g, 'interior');
  scene.add(topCeilingGroup);
  register(topCeilingGroup, 'top');
}

