// 雨夜便利店街角 · 微缩三维模型（三渲二 + 从下往上分层搭建 + 实时音效与动态天气）
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setGlow, canvasTex } from './utils.js';
import { finalizeIntro, updateIntro, resetIntro, INTRO_END } from './intro.js';
import { buildBase, buildGround, buildPuddles } from './world.js';
import { buildStoreShell, buildStoreTop, buildStoreInterior, roofMats, roofRef, doors, storeLights } from './store.js';
import { buildApartments } from './buildings.js';
import { buildStreet, lampSpots } from './street.js';
import { buildRain, buildDecals, buildCones, updateFx, setWeatherMode, nextWeatherMode, triggerLightning } from './fx.js';
import { createPost } from './post.js';
import { initAudio, toggleMute, playKonbiniChime, playPromoBgm, getAudioStream } from './audio.js';

// ---------- 渲染器 / 场景 ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = canvasTex(512, 512, (c, w, h) => {
  const g = c.createRadialGradient(w * 0.5, h * 0.55, 20, w * 0.5, h * 0.55, w * 0.8);
  g.addColorStop(0, '#2d3282'); g.addColorStop(0.5, '#171b52'); g.addColorStop(1, '#090b24');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.5, 200);
const target = new THREE.Vector3(0, 1.4, 0.2);

// ---------- 灯光 ----------
const hemi = new THREE.HemisphereLight('#7f8ee8', '#2a2450', 1.35);
scene.add(hemi);
const moon = new THREE.DirectionalLight('#9fb4ff', 1.1);
moon.position.set(-8, 14, 6);
scene.add(moon);

function addPoint(x, y, z, color, intensity, dist, decay = 1.6) {
  const l = new THREE.PointLight(color, 0, dist, decay);
  l.position.set(x, y, z);
  l.userData.full = intensity;
  scene.add(l);
  return l;
}
const dynLights = [];

// ---------- 建造场景 ----------
buildBase(scene);
buildGround(scene);
buildPuddles(scene);
buildStoreShell(scene);
buildApartments(scene);
buildStoreInterior(scene);
buildStreet(scene);
buildStoreTop(scene);
buildRain(scene);
buildDecals(scene, lampSpots);
buildCones(scene, lampSpots);
for (const l of lampSpots) dynLights.push(addPoint(l.x, l.y - 0.2, l.z, '#ffd9a0', 1.6, 8));
for (const l of storeLights) { l.userData.full = l.intensity; l.intensity = 0; dynLights.push(l); }
dynLights.push(addPoint(4.4, 1.3, -2.9, '#bfe8ff', 0.9, 5));
dynLights.push(addPoint(-4.75, 2.0, -4.6, '#ff8a5a', 1.2, 5));

finalizeIntro(scene);
initAudio();

// ---------- 后期 ----------
const post = createPost(renderer, scene, camera);
post.refreshTagged();

// ---------- 控制器 ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 7;
controls.maxDistance = 48;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.7;
let introCam = true;
let promoActive = false;
let promoEvents = {};
const defaultTarget = new THREE.Vector3(0, 1.4, 0.2);

controls.addEventListener('start', () => {
  introCam = false;
  promoActive = false;
});
renderer.domElement.addEventListener('wheel', () => {
  introCam = false;
  promoActive = false;
}, { passive: true });

// 稳重优雅的入场运镜：先以略高俯角清晰观察从地面往上搭建与店内陈设组装，再平滑落位到最佳街角观赏视角
const START = { az: 0.16, el: 0.68, r: 32 };
const FINAL = { az: 0.62, el: 0.50, r: 27 };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function setCam(az, el, r) {
  camera.position.set(
    target.x + r * Math.sin(az) * Math.cos(el),
    target.y + r * Math.sin(el),
    target.z + r * Math.cos(az) * Math.cos(el),
  );
}
setCam(START.az, START.el, START.r);
controls.update();

// ---------- URL 调试参数（?t=秒 跳过入场动画；?az= ?el= ?r= 指定视角；?w= 指定天气）----------
const qs = new URLSearchParams(location.search);
const timeOffset = parseFloat(qs.get('t') || '0');
const hold = qs.get('t') !== null;
if (qs.has('w')) setWeatherMode(parseInt(qs.get('w'), 10), true);
if (hold) {
  const k = ease(Math.min(1, timeOffset / (INTRO_END - 0.4)));
  setCam(START.az + (FINAL.az - START.az) * k, START.el + (FINAL.el - START.el) * k, START.r + (FINAL.r - START.r) * k);
  controls.update();
}
if (qs.has('az') || qs.has('el') || qs.has('r')) {
  introCam = false;
  setCam(parseFloat(qs.get('az') ?? FINAL.az), parseFloat(qs.get('el') ?? FINAL.el), parseFloat(qs.get('r') ?? FINAL.r));
  controls.update();
}

// ---------- 主循环与交互快捷键 ----------
const clock = new THREE.Clock();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let T0 = 0;
let doorChimeCycle = -1;
window.__ready = false;

// 电影级自动宣传片运镜关键帧（25 秒一镜到底全亮点展示）
const PROMO_KEYS = [
  { t: 0.0,  az: 0.14,  el: 0.68, r: 30.5, tx: 0.0,  ty: 1.40, tz: 0.20 }, // 俯角看底座与店内陈设生长
  { t: 4.5,  az: 0.38,  el: 0.56, r: 28.0, tx: 0.0,  ty: 1.50, tz: 0.00 }, // 1F->2F->3F 逐层向上搭建
  { t: 9.2,  az: 0.62,  el: 0.48, r: 26.5, tx: 0.0,  ty: 1.40, tz: 0.20 }, // 全场景霓虹通电点亮 + 飘雨
  { t: 11.4, az: 0.16,  el: 0.18, r: 12.0, tx: 0.15, ty: 1.42, tz: -1.55 }, // 推镜至落地橱窗前看店内暖光
  { t: 14.2, az: -0.15, el: 0.17, r: 11.4, tx: -0.45,ty: 1.42, tz: -1.60 }, // 横移掠过拉面吧台、关东煮与收银台
  { t: 16.5, az: 0.32,  el: 1.25, r: 22.0, tx: -0.20,ty: 1.40, tz: -1.60 }, // 拉高俯视触发屋顶半透明剖切（娃娃屋视角）
  { t: 18.8, az: -0.66, el: 0.32, r: 19.5, tx: -2.50,ty: 1.60, tz: -2.20 }, // 俯冲掠过西侧居酒屋后巷与红灯笼
  { t: 21.4, az: 0.78,  el: 0.35, r: 23.0, tx: 0.60, ty: 1.35, tz: 0.20 }, // 环绕至东侧街角贩卖机与雷暴闪电
  { t: 25.0, az: 0.58,  el: 0.46, r: 26.8, tx: 0.0,  ty: 1.40, tz: 0.20 }, // 晴朗星夜下微缩收藏盒全景定格
];

function replayIntro() {
  if (hold) return;
  promoActive = false;
  target.copy(defaultTarget);
  controls.target.copy(defaultTarget);
  resetIntro();
  T0 = 0;
  doorChimeCycle = -1;
  introCam = true;
}

function startPromoTour() {
  if (hold) return;
  setWeatherMode(1, true); // 以经典雨夜开场
  resetIntro();
  T0 = 0;
  doorChimeCycle = -1;
  introCam = false;
  promoActive = true;
  promoEvents = { chime1: false, storm: false, bolt: false, clear: false };
  playPromoBgm(25.0);
}

window.__startPromoTour = startPromoTour;
window.__getAudioStream = getAudioStream;
window.__getPromoState = () => ({ active: promoActive, t: T0 });

renderer.domElement.addEventListener('dblclick', replayIntro);
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'r') replayIntro();
  else if (k === 'p') startPromoTour();
  else if (k === '1') setWeatherMode(0, true);
  else if (k === '2') setWeatherMode(1, true);
  else if (k === '3') setWeatherMode(2, true);
  else if (k === '4') setWeatherMode(3, true);
  else if (k === 'w') nextWeatherMode();
  else if (k === 'l') triggerLightning(1.0);
  else if (k === 'm') toggleMute();
});

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  T0 += dt;
  const tNow = hold ? timeOffset : T0;

  updateIntro(tNow);

  // 点亮：当建筑与街道组装接近完成时（7.2s ~ 9.5s），由暗到亮，带霓虹开机微闪
  let glow = 0.12 + 0.88 * smooth(7.0, 9.4, tNow);
  if (tNow > 7.4 && tNow < 9.6) glow *= 0.86 + 0.14 * Math.sin(tNow * 38) * (1 - smooth(8.6, 9.6, tNow));
  setGlow(glow);
  const lightK = smooth(4.5, 9.2, tNow) * 0.9 + 0.1;
  for (const l of dynLights) l.intensity = l.userData.full * lightK;

  // 天气与雷光更新
  const rainK = smooth(7.6, 9.6, tNow);
  const flash = updateFx(hold ? timeOffset + T0 : T0, rainK, dt);
  hemi.intensity = 1.35 + flash * 1.1;
  moon.intensity = 1.1 + flash * 2.0;

  // 自动门周期开合 + 便利店迎宾门铃声
  if (tNow > INTRO_END) {
    const elapsed = tNow - INTRO_END;
    const cyc = Math.floor(elapsed / 14);
    const ph = (elapsed % 14) / 14;
    if (ph > 0.18 && ph < 0.25 && cyc !== doorChimeCycle) {
      doorChimeCycle = cyc;
      playKonbiniChime();
    }
    const open = smooth(0.18, 0.25, ph) * (1 - smooth(0.45, 0.52, ph));
    if (doors.left) {
      doors.left.position.x = doors.lx - 0.58 * open;
      doors.right.position.x = doors.rx + 0.52 * open;
    }
  }

  // 入场运镜或电影级自动宣传片运镜
  if (promoActive && !hold) {
    // 宣传片节点事件触发
    if (tNow >= 10.6 && !promoEvents.chime1) {
      promoEvents.chime1 = true;
      playKonbiniChime();
    }
    if (tNow >= 18.6 && !promoEvents.storm) {
      promoEvents.storm = true;
      setWeatherMode(2, true); // 切换雷暴
    }
    if (tNow >= 19.6 && !promoEvents.bolt) {
      promoEvents.bolt = true;
      triggerLightning(1.25); // 劈下 3D 分叉闪电 + 雷鸣
    }
    if (tNow >= 21.8 && !promoEvents.clear) {
      promoEvents.clear = true;
      setWeatherMode(3, true); // 雨停切换至璀璨星夜
    }
    // 推镜至店门前时自动平滑敞开感应门
    if (tNow > 10.5 && tNow < 14.5 && doors.left) {
      const open = smooth(10.5, 11.2, tNow) * (1 - smooth(13.8, 14.4, tNow));
      doors.left.position.x = doors.lx - 0.58 * open;
      doors.right.position.x = doors.rx + 0.52 * open;
    }

    // 关键帧平滑插值
    let seg = PROMO_KEYS.length - 2;
    for (let i = 0; i < PROMO_KEYS.length - 1; i++) {
      if (tNow < PROMO_KEYS[i + 1].t) { seg = i; break; }
    }
    const a = PROMO_KEYS[seg], b = PROMO_KEYS[seg + 1];
    const u = ease(Math.min(1, Math.max(0, (tNow - a.t) / (b.t - a.t))));
    target.set(
      a.tx + (b.tx - a.tx) * u,
      a.ty + (b.ty - a.ty) * u,
      a.tz + (b.tz - a.tz) * u,
    );
    controls.target.copy(target);
    setCam(
      a.az + (b.az - a.az) * u,
      a.el + (b.el - a.el) * u,
      a.r + (b.r - a.r) * u,
    );
    if (tNow >= 25.5) promoActive = false;
  } else if (introCam && !hold) {
    const k = ease(Math.min(1, tNow / (INTRO_END - 0.3)));
    setCam(START.az + (FINAL.az - START.az) * k, START.el + (FINAL.el - START.el) * k, START.r + (FINAL.r - START.r) * k);
    if (tNow > INTRO_END) introCam = false;
  }
  controls.update();

  // 俯视时屋顶淡出（娃娃屋式剖面），方便从上方观察店内
  const elev = Math.asin(THREE.MathUtils.clamp((camera.position.y - target.y) / camera.position.distanceTo(target), -1, 1));
  const op = 1 - smooth(0.88, 1.18, elev);
  for (const m of roofMats) {
    m.transparent = op < 0.999;
    m.opacity = op;
    m.depthWrite = op > 0.5;
  }
  if (tNow > 7.8) {
    for (const ex of roofRef.extras) ex.visible = op > 0.35;
  }
  roofRef.group.userData.noOutline = op < 0.95;
  if (op < 0.95 && !post.isTagged(roofRef.group)) post.refreshTagged();
  if (op >= 0.95 && post.isTagged(roofRef.group)) post.refreshTagged();

  post.render();
  if (!window.__ready && tNow > 0.2) window.__ready = true;
  requestAnimationFrame(frame);
}
frame();

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.resize(w, h);
});
