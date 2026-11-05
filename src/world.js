// 底座 + 地面：道路、人行道、路缘、标线、斑马线、排水沟、积水
import * as THREE from 'three';
import { T, G, box, cyl, flat, plane, group, canvasTex, labelTex, FONT, rnd, rr, pick } from './utils.js';
import { register } from './intro.js';

export const SW = 0.15;        // 人行道/路缘高度
export const BLOCK = { x0: -8, x1: 5.8, z0: -8, z1: 4.9, r: 1.3 };   // 街区（人行道 + 地块）范围

export function buildBase(scene) {
  const g = group();

  // 底座主体（深色）+ 四周浅色边框（像一个收藏展示盘）
  box(g, 16.6, 1.02, 16.6, 0, -1.1, 0, T('#2b3160', 0.15));
  // 侧面发光灯带
  const strip = G('#59d8ff', 1.5);
  box(g, 16.7, 0.04, 16.7, 0, -0.78, 0, strip);
  box(g, 16.7, 0.04, 16.7, 0, -0.34, 0, G('#ff6fb5', 1.3));
  // 地面沥青层
  box(g, 16, 0.08, 16, 0, -0.08, 0, T('#2c3050', 0.12));

  // 边框
  const rim = T('#cfcbe6', 0.2);
  box(g, 16.6, 0.4, 0.3, 0, -0.1, 8.15, rim);
  box(g, 16.6, 0.4, 0.3, 0, -0.1, -8.15, rim);
  box(g, 0.3, 0.4, 16.0, 8.15, -0.1, 0, rim);
  box(g, 0.3, 0.4, 16.0, -8.15, -0.1, 0, rim);

  // 南侧铭牌
  const plate = labelTex('雨夜コンビニ  ·  RAINY NIGHT KONBINI', 1024, 112, {
    bg: '#161a3a', fg: '#ffe9b8', size: 54, font: 700, border: '#59d8ff', radius: 18,
  });
  const pm = new THREE.MeshBasicMaterial({ map: plate });
  const pl = plane(g, 6.4, 0.7, 0, -0.62, 8.31, pm);
  const pl2 = plane(g, 6.4, 0.7, 8.31, -0.62, 0, pm, Math.PI / 2);
  scene.add(g);
  register(g, 'base');
}

// ---------- 贴图 ----------
function tileTex(base, line, n = 4) {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = line; ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.lineWidth = 2; ctx.stroke();
  }, [1, 1]);
}

function tactileTex() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8c23a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f6dd6e';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.beginPath(); ctx.arc(16 + i * 32, 16 + j * 32, 8, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#a8891c'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, w, h);
  });
}

function grateTex() {
  return canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#12142a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4b5278';
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 16 + 3, 6, 6, h - 12);
    ctx.strokeStyle = '#6a7298'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, w, h);
  });
}

/** 积水贴图：椭圆 + 倒影高光 + 暖/冷霓虹反射 */
function puddleTex(base, tint, hi) {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.47, h * 0.47, 0, 0, 7); ctx.clip();
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, base); gr.addColorStop(1, tint);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    // 倒影的竖向光带
    ctx.globalAlpha = 0.55; ctx.fillStyle = hi;
    ctx.fillRect(w * 0.22, 0, w * 0.1, h);
    ctx.globalAlpha = 0.35; ctx.fillRect(w * 0.42, 0, w * 0.05, h);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
    ctx.save(); ctx.translate(w * 0.62, h * 0.5); ctx.rotate(-0.5);
    ctx.fillRect(-w * 0.28, -h * 0.03, w * 0.5, h * 0.045);
    ctx.fillRect(-w * 0.2, h * 0.07, w * 0.32, h * 0.025);
    ctx.restore();
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(190,215,255,0.55)';
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.46, h * 0.46, 0, 0, 7); ctx.stroke();
  });
}

export function buildGround(scene) {
  const g = group();
  const { x0, x1, z0, z1, r } = BLOCK;

  // ===== 街区（带圆角街角的人行道/地块）=====
  const shp = new THREE.Shape();
  shp.moveTo(x0, z0);
  shp.lineTo(x1, z0);
  shp.lineTo(x1, z1 - r);
  shp.absarc(x1 - r, z1 - r, r, 0, Math.PI / 2, false);
  shp.lineTo(x0, z1);
  shp.closePath();
  const geo = new THREE.ExtrudeGeometry(shp, { depth: SW, bevelEnabled: false, curveSegments: 20 });
  geo.rotateX(Math.PI / 2);
  const tt = tileTex('#6b7194', '#5a6084');
  tt.repeat.set(1 / 1.1, 1 / 1.1);
  const top = T('#ffffff', 0.1, { map: tt, unique: true });
  const blk = new THREE.Mesh(geo, [top, T('#a9aed0', 0.25)]);
  blk.position.y = SW;
  g.add(blk);

  // 店前地块（混凝土）
  const fc = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#7b81a4'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6c7296'; c.lineWidth = 3; c.strokeRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 24; i++) c.fillRect(rnd() * w, rnd() * h, 6, 3);
  }, [3.4, 1.6]);
  const fcm = T('#ffffff', 0.1, { map: fc, unique: true });
  flat(g, 8.9, 3.4, (-3.9 + 5.0) / 2, SW + 0.004, (0.5 + 3.9) / 2, fcm);

  // 巷道（略暗的沥青）
  flat(g, 1.7, 8.0, -4.75, SW + 0.004, 0.0, T('#4a4f72', 0.1));
  flat(g, 1.7, 3.4, -4.75, SW + 0.005, 2.6, T('#7b81a4', 0.1));

  // ===== 盲道（点字砖）=====
  const tacG = group();
  const tex = tactileTex();
  const tm = (rx, ry = 1) => { const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return T('#ffffff', 0.35, { map: t, unique: true }); };
  const sLen = 12.95;
  box(tacG, sLen, 0.02, 0.3, x0 + sLen / 2, SW, 4.22, tm(sLen / 0.3, 1));
  const eLen = 12.15;
  box(tacG, 0.3, 0.02, eLen, 5.1, SW, z0 + eLen / 2, tm(1, eLen / 0.3));
  box(tacG, 0.9, 0.022, 0.5, 2.7, SW, 4.55, tm(3, 1.6));
  box(tacG, 0.5, 0.022, 0.9, 5.42, SW, 1.5, tm(1.6, 3));
  g.add(tacG);

  // ===== 道路标线 =====
  const lineG = group();
  const white = T('#e9ecfa', 0.5);
  for (let x = -7.6; x < 7.8; x += 1.2) flat(lineG, 0.7, 0.1, x + 0.35, 0.006, 6.45, white);
  for (let z = -7.6; z < 4.3; z += 1.2) flat(lineG, 0.1, 0.7, 6.9, 0.006, z + 0.35, white);
  for (let i = 0; i < 7; i++) flat(lineG, 2.3, 0.26, 2.7, 0.008, 5.22 + i * 0.43, white);
  for (let i = 0; i < 5; i++) flat(lineG, 0.26, 2.0, 6.1 + i * 0.4, 0.008, 1.5, white);
  flat(lineG, 0.14, 1.45, 4.25, 0.007, 5.7, white);
  flat(lineG, 1.1, 0.14, 6.45, 0.007, 3.5, white);
  g.add(lineG);

  // ===== 排水沟（带格栅）+ 井盖 =====
  const drainG = group();
  const gt = grateTex();
  const gm = (len) => { const t = gt.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 0.9, 1); return new THREE.MeshBasicMaterial({ map: t }); };
  flat(drainG, 12.0, 0.26, -2.0, 0.012, 5.06, gm(12.0));
  const eg = flat(drainG, 11.2, 0.26, 0, 0.012, 0, gm(11.2));
  eg.rotation.y = Math.PI / 2; eg.position.set(5.98, 0.012, -2.4);

  const mh = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#3a3f60'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
    c.strokeStyle = '#6d759c'; c.lineWidth = 5;
    for (const rad of [54, 38, 22]) { c.beginPath(); c.arc(64, 64, rad, 0, 7); c.stroke(); }
    c.lineWidth = 4; c.beginPath(); c.moveTo(10, 64); c.lineTo(118, 64); c.moveTo(64, 10); c.lineTo(64, 118); c.stroke();
  });
  const mhm = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: mh, transparent: true }));
  mhm.position.set(6.9, 0.012, 5.55); drainG.add(mhm);
  const mhm2 = mhm.clone(); mhm2.position.set(-4.0, 0.012, 7.2); mhm2.scale.setScalar(0.85); drainG.add(mhm2);
  g.add(drainG);

  // 路缘石（街区边界的亮线）
  const curbG = group();
  const curb = T('#c9cde8', 0.3);
  box(curbG, 11.2, 0.03, 0.08, -2.4, SW, 4.86, curb);
  box(curbG, 0.08, 0.03, 10.7, 5.76, SW, -2.65, curb);
  g.add(curbG);

  scene.add(g);
  register(g, 'ground', true);
}

/** 积水坑 + 涟漪（涟漪动画由 fx 更新） */
export const ripples = [];
export function buildPuddles(scene) {
  const g = group();
  const cool = puddleTex('#3a5aa8', '#27427f', '#9fd3ff');
  const warm = puddleTex('#a5744f', '#6b4d6a', '#ffd9a0');
  const pink = puddleTex('#8a4a9a', '#3a4a96', '#ff9ad0');
  const mk = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mc = mk(cool), mw = mk(warm), mp = mk(pink);
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const list = [
    // [x, z, 宽, 深, 旋转, y, 材质]
    [-1.6, 3.2, 1.9, 0.95, 0.3, SW + 0.012, mw],
    [1.6, 2.5, 1.3, 0.8, -0.2, SW + 0.012, mw],
    [3.6, 3.2, 1.0, 0.7, 0.5, SW + 0.012, mc],
    [-5.0, 2.4, 0.9, 1.7, 0.1, SW + 0.012, mp],
    [-4.8, -2.0, 0.8, 2.0, 0.0, SW + 0.012, mp],
    [-6.6, 4.1, 1.4, 0.5, 0.0, SW + 0.012, mc],
    [4.5, -1.2, 1.1, 0.9, 0.8, SW + 0.012, mc],
    [4.3, -5.6, 1.2, 0.8, 0.2, SW + 0.012, mc],
    [-1.0, 6.2, 2.4, 0.9, 0.0, 0.016, mw],
    [3.8, 7.2, 2.0, 0.75, 0.15, 0.016, mc],
    [6.9, 6.9, 1.7, 1.1, 0.4, 0.016, mp],
    [-6.0, 7.0, 2.2, 0.8, -0.1, 0.016, mc],
    [7.1, 0.0, 0.9, 2.1, 0.0, 0.016, mw],
    [7.0, -4.5, 0.8, 1.9, 0.1, 0.016, mc],
    [-2.8, 5.6, 1.6, 0.5, 0.0, 0.016, mc],
    [1.0, 7.4, 1.2, 0.5, 0.0, 0.016, mp],
  ];
  for (const [x, z, w, d, ry, y, m] of list) {
    const p = new THREE.Mesh(geo, m);
    p.position.set(x, y, z); p.scale.set(w, 1, d); p.rotation.y = ry;
    p.userData.noOutline = true;
    g.add(p);
    // 涟漪
    const n = w * d > 1.5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const rg = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 28).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0, depthWrite: false }));
      rg.position.set(x + (rnd() - 0.5) * w * 0.55, y + 0.004, z + (rnd() - 0.5) * d * 0.55);
      rg.userData.noOutline = true;
      rg.userData.ripple = { phase: rnd(), speed: 0.55 + rnd() * 0.5, max: Math.min(w, d) * 0.28 };
      ripples.push(rg);
      rg.visible = false;
      scene.add(rg);
    }
  }
  scene.add(g);
  register(g, 'ground', false);
}
