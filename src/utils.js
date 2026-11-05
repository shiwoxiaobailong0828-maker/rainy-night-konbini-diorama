// 通用工具：卡通材质、发光材质、几何体简写、画布贴图
import * as THREE from 'three';

// ---------- 三渲二：色阶渐变图 ----------
const gradData = new Uint8Array([70, 140, 205, 255]);
export const gradientMap = new THREE.DataTexture(gradData, gradData.length, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.generateMipmaps = false;
gradientMap.needsUpdate = true;

// ---------- 材质 ----------
const matCache = new Map();

/** 卡通材质。emi 为自发光比例（让室内等区域保持明亮温暖） */
export function T(hex, emi = 0, opts = {}) {
  const unique = opts.unique;
  const key = `${hex}|${emi}|${JSON.stringify(opts)}`;
  if (!unique && matCache.has(key)) return matCache.get(key);
  const c = new THREE.Color(hex);
  const { unique: _u, ...rest } = opts;
  const m = new THREE.MeshToonMaterial({
    color: c,
    gradientMap,
    emissive: c.clone().multiplyScalar(emi),
    ...rest,
  });
  if (!unique) matCache.set(key, m);
  return m;
}

// 发光材质登记表：开场动画时统一"点亮"
export const glowList = [];

/** 纯发光材质（霓虹、灯箱、灯管等），k>1 时会触发泛光 */
export function G(hex, k = 1.5, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), ...opts });
  glowList.push({ mat: m, base: m.color.clone(), opacity: m.opacity });
  return m;
}

/** 贴图发光材质 */
export function GT(tex, k = 1.2, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k), ...opts });
  glowList.push({ mat: m, base: m.color.clone(), opacity: m.opacity });
  return m;
}

/** 设置全局点亮系数（0~1） */
export function setGlow(f) {
  for (const g of glowList) {
    g.mat.color.copy(g.base).multiplyScalar(f);
    if (g.mat.transparent && g.mat.userData.fadeWithLight) g.mat.opacity = g.opacity * f;
  }
}

// ---------- 几何体 ----------
const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

/** 盒子：y 为底面高度，x/z 为中心 */
export function box(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat);
  m.position.set(x, y + h / 2, z);
  parent?.add(m);
  return m;
}

/** 圆柱：y 为底面高度 */
export function cyl(parent, rt, rb, h, x, y, z, mat, seg = 16) {
  const m = new THREE.Mesh(cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat);
  m.position.set(x, y + h / 2, z);
  parent?.add(m);
  return m;
}

/** 球体（以球心定位） */
export function sph(parent, r, x, y, z, mat, seg = 16) {
  const m = new THREE.Mesh(cached(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0))), mat);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}

/** 平面（面朝 +z，可用 ry 旋转） */
export function plane(parent, w, h, x, y, z, mat, ry = 0) {
  const m = new THREE.Mesh(cached(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent?.add(m);
  return m;
}

/** 水平贴地平面（面朝 +y） */
export function flat(parent, w, d, x, y, z, mat, ry = 0) {
  const m = new THREE.Mesh(cached(`f${w},${d}`, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent?.add(m);
  return m;
}

export function group(x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  return g;
}

/** 两点之间的细圆柱（管线、栏杆） */
export function rod(parent, a, b, r, mat, seg = 8) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const m = new THREE.Mesh(cached(`r${r},${len.toFixed(3)},${seg}`, () => new THREE.CylinderGeometry(r, r, len, seg)), mat);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  parent?.add(m);
  return m;
}

// ---------- 画布贴图 ----------
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export const FONT = '"Yu Gothic UI","Microsoft YaHei UI","Hiragino Sans","Noto Sans CJK JP","Meiryo",sans-serif';

/** 圆角矩形路径 */
export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 简单文字标牌贴图 */
export function labelTex(text, w, h, { bg = '#fff', fg = '#222', font = 700, size, border, sub, subSize, radius = 0 } = {}) {
  return canvasTex(w, h, (ctx) => {
    if (bg) {
      ctx.fillStyle = bg;
      if (radius) { rrect(ctx, 0, 0, w, h, radius); ctx.fill(); } else ctx.fillRect(0, 0, w, h);
    }
    if (border) {
      ctx.strokeStyle = border; ctx.lineWidth = Math.max(4, w * 0.02);
      if (radius) { rrect(ctx, 4, 4, w - 8, h - 8, radius); ctx.stroke(); } else ctx.strokeRect(4, 4, w - 8, h - 8);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const s = size || h * 0.5;
    ctx.font = `${font} ${s}px ${FONT}`;
    ctx.fillText(text, w / 2, sub ? h * 0.38 : h / 2 + s * 0.04);
    if (sub) {
      ctx.font = `${font} ${subSize || s * 0.5}px ${FONT}`;
      ctx.fillText(sub, w / 2, h * 0.76);
    }
  });
}

/** 霓虹字贴图（透明底） */
export function neonTex(text, w, h, color, { size, font = 800, glow = 22 } = {}) {
  return canvasTex(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const s = size || h * 0.6;
    ctx.font = `${font} ${s}px ${FONT}`;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.12;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, w / 2, h / 2);
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fillText(text, w / 2, h / 2);
  });
}

// 伪随机（确定性，保证每次载入一致）
let _seed = 20261105;
export function rnd() {
  _seed = (_seed * 1664525 + 1013904223) % 4294967296;
  return _seed / 4294967296;
}
export const rr = (a, b) => a + (b - a) * rnd();
export const pick = (arr) => arr[(rnd() * arr.length) | 0];
