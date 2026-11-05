// 特效与动态天气系统：多层雨丝、屋檐滴水、地面光斑、体积光锥、涟漪、贴地雨雾、闪电雷鸣、雨后星夜
import * as THREE from 'three';
import { canvasTex, glowList, rnd, rr } from './utils.js';
import { ripples } from './world.js';
import { swayObjects } from './street.js';
import { playThunder, updateRainAudio } from './audio.js';

// ---------- 雨 ----------
const rainVert = /* glsl */`
  uniform float uTime, uHeight, uSpeed, uLen, uSlant;
  attribute vec4 aData;   // x, z, phase, minY
  attribute float aEnd;   // 0: 雨滴头部  1: 尾部
  varying float vA;
  void main() {
    float jit = fract(sin(aData.z * 91.7) * 43758.5);
    float sp = uSpeed * (0.85 + 0.3 * jit);
    float span = uHeight - aData.w;
    float f = fract(aData.z + uTime * sp / span);
    float y = aData.w + span * (1.0 - f);
    float slant = (uHeight - y) * uSlant;
    vec3 p = vec3(aData.x + slant, y + aEnd * uLen, aData.y);
    p.x += aEnd * uLen * uSlant;
    vA = (1.0 - aEnd) * (0.45 + 0.4 * jit) * smoothstep(0.0, 0.5, y - aData.w + 0.02);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const rainFrag = /* glsl */`
  uniform vec3 uColor; uniform float uFade;
  varying float vA;
  void main() { gl_FragColor = vec4(uColor, vA * uFade); }
`;

export const rainUniforms = [];
function makeRain({ count, height, speed, len, slant, color, area, footprints = [], fixedZ, isDrip = false }) {
  const pos = new Float32Array(count * 2 * 3);
  const data = new Float32Array(count * 2 * 4);
  const end = new Float32Array(count * 2);
  let n = 0;
  while (n < count) {
    const x = rr(area[0], area[1]);
    const z = fixedZ !== undefined ? fixedZ : rr(area[2], area[3]);
    let minY = 0.17;
    for (const f of footprints) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) minY = Math.max(minY, f.y);
    if (minY >= height - 0.5) continue;
    const ph = rnd() * 50;
    for (let k = 0; k < 2; k++) {
      const i = n * 2 + k;
      data[i * 4] = x; data[i * 4 + 1] = z; data[i * 4 + 2] = ph; data[i * 4 + 3] = minY;
      end[i] = k;
    }
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aData', new THREE.BufferAttribute(data, 4));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const uniforms = {
    uTime: { value: 0 }, uHeight: { value: height }, uSpeed: { value: speed }, uLen: { value: len },
    uSlant: { value: slant }, uColor: { value: new THREE.Color(color) }, uFade: { value: 0 },
    baseSpeed: speed, baseLen: len, baseSlant: slant, isDrip,
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: rainVert, fragmentShader: rainFrag, uniforms, transparent: true, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.userData.noOutline = true;
  rainUniforms.push(uniforms);
  return lines;
}

// ---------- 天气元素：薄雾、闪电、星群 ----------
const mistMeshes = [];
let starsMesh = null;
let lightningGroup = null;
let lightningMat = null;
let flashDecay = 0;
let nextBoltAt = 16.5;

// 4 档天气预设：0-微雨薄雾, 1-夜雨霓虹(默认), 2-雷雨交加, 3-雨后星夜
const WEATHER_PRESETS = [
  { name: 'drizzle', rain: 0.48, wind: 0.25, slant: 0.05, mist: 0.22, stars: 0.15, storm: false },
  { name: 'rain',    rain: 1.00, wind: 0.50, slant: 0.11, mist: 0.16, stars: 0.00, storm: false },
  { name: 'storm',   rain: 1.42, wind: 1.15, slant: 0.22, mist: 0.26, stars: 0.00, storm: true  },
  { name: 'clear',   rain: 0.00, wind: 0.20, slant: 0.02, mist: 0.08, stars: 0.95, storm: false },
];
let currentPresetIdx = 1;
let autoCycle = true;
const weatherState = { rain: 1.0, wind: 0.5, slant: 0.11, mist: 0.16, stars: 0.0 };

export function setWeatherMode(idx, disableAuto = true) {
  currentPresetIdx = ((idx % WEATHER_PRESETS.length) + WEATHER_PRESETS.length) % WEATHER_PRESETS.length;
  if (disableAuto) autoCycle = false;
  if (WEATHER_PRESETS[currentPresetIdx].storm) triggerLightning(0.95);
}

export function nextWeatherMode() {
  setWeatherMode(currentPresetIdx + 1, true);
}

export function triggerLightning(strength = 1.0) {
  flashDecay = Math.max(flashDecay, strength);
  if (lightningGroup) {
    lightningGroup.position.x = (Math.random() - 0.5) * 10;
    lightningGroup.rotation.z = (Math.random() - 0.5) * 0.25;
  }
  playThunder(strength);
}

export function buildRain(scene) {
  const footprints = [
    { x0: -4.1, x1: 3.3, z0: -4.7, z1: 0.65, y: 4.4 },        // 便利店（含招牌）
    { x0: -4.1, x1: 3.3, z0: 0.65, z1: 1.9, y: 2.7 },         // 雨棚
    { x0: -8.1, x1: -5.5, z0: -5.5, z1: 0.9, y: 6.7 },        // 公寓
    { x0: -5.7, x1: 5.9, z0: -8.1, z1: -5.3, y: 5.4 },        // 后排楼
  ];
  scene.add(makeRain({ count: 3200, height: 11, speed: 12, len: 0.7, slant: 0.1, color: '#c8dcff', area: [-8.2, 8.2, -8.2, 8.2], footprints }));
  scene.add(makeRain({ count: 900, height: 11, speed: 9, len: 0.45, slant: 0.1, color: '#8fb0ff', area: [-8.2, 8.2, -8.2, 8.2], footprints }));
  // 屋檐滴水
  scene.add(makeRain({ count: 46, height: 2.62, speed: 2.6, len: 0.22, slant: 0, color: '#e6f2ff', area: [-4.0, 3.2, 0, 0], fixedZ: 1.86, footprints: [], isDrip: true }));
  scene.add(makeRain({ count: 18, height: 2.4, speed: 2.4, len: 0.2, slant: 0, color: '#e6f2ff', area: [-5.0, -4.0, 0, 0], fixedZ: 0.9, footprints: [], isDrip: true }));

  // 贴地流动薄雾
  const mistTex = radialTex();
  const mistPositions = [
    [-4.75, 0.85, -1.5, 3.2, 4.5],
    [1.0, 0.45, 5.8, 7.5, 3.5],
    [6.6, 0.45, -1.5, 3.2, 6.5],
    [-1.2, 0.5, 2.5, 5.5, 3.0],
  ];
  mistPositions.forEach(([x, y, z, w, d], i) => {
    const m = new THREE.MeshBasicMaterial({
      map: mistTex, color: '#8aa8ff', transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m);
    mesh.position.set(x, y, z);
    mesh.userData.noOutline = true;
    mesh.userData.baseX = x;
    mesh.userData.phase = i * 1.7;
    mistMeshes.push(mesh);
    scene.add(mesh);
  });

  // 夜空星群（雨后初霁模式显现）
  const starCount = 160;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const th = rnd() * Math.PI * 2;
    const ph = 0.2 + rnd() * 1.1;
    const R = 36 + rnd() * 18;
    starPos[i * 3] = Math.cos(th) * Math.cos(ph) * R;
    starPos[i * 3 + 1] = 8 + Math.sin(ph) * R * 0.65;
    starPos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * R;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#e8f2ff', size: 0.35, transparent: true, opacity: 0, depthWrite: false });
  starsMesh = new THREE.Points(starGeo, starMat);
  starsMesh.userData.noOutline = true;
  scene.add(starsMesh);

  // 远空 3D 闪电束
  lightningGroup = new THREE.Group();
  lightningGroup.position.set(-2, 7.2, -13.5);
  lightningMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8ecff').multiplyScalar(2.4), transparent: true, opacity: 0, depthWrite: false });
  const boltPts = [
    new THREE.Vector3(0, 6.5, 0), new THREE.Vector3(-0.6, 4.8, 0), new THREE.Vector3(0.3, 3.4, 0),
    new THREE.Vector3(-0.5, 1.6, 0), new THREE.Vector3(0.2, 0.2, 0), new THREE.Vector3(-0.3, -1.5, 0),
  ];
  const branchPts = [
    new THREE.Vector3(0.3, 3.4, 0), new THREE.Vector3(1.2, 2.1, 0), new THREE.Vector3(1.7, 0.9, 0),
  ];
  const mainBolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(boltPts), 16, 0.06, 5, false), lightningMat);
  const subBolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(branchPts), 8, 0.035, 4, false), lightningMat);
  mainBolt.userData.noOutline = true;
  subBolt.userData.noOutline = true;
  lightningGroup.add(mainBolt, subBolt);
  scene.add(lightningGroup);
}

// ---------- 发光贴花 ----------
function fadeTex() {
  return canvasTex(128, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in';
    const g2 = c.createLinearGradient(0, 0, w, 0);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.15, 'rgba(0,0,0,1)'); g2.addColorStop(0.85, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g2; c.fillRect(0, 0, w, h);
  });
}
function radialTex() {
  return canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}
function coneTex() {
  return canvasTex(8, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}

function addDecal(scene, tex, color, k, op, w, d, x, y, z, ry = 0) {
  const m = new THREE.MeshBasicMaterial({
    map: tex, color: new THREE.Color(color).multiplyScalar(k), transparent: true, opacity: op,
    blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m);
  mesh.position.set(x, y, z); mesh.rotation.y = ry;
  mesh.userData.noOutline = true;
  mesh.renderOrder = 1;
  glowList.push({ mat: m, base: m.color.clone(), opacity: op });
  m.userData.fadeWithLight = true;
  scene.add(mesh);
  return mesh;
}

export function buildDecals(scene, lamps) {
  const fe = fadeTex(), rd = radialTex();
  const S = 0.16;
  addDecal(scene, fe, '#ffcf8a', 0.9, 0.28, 6.2, 3.2, -1.1, S + 0.006, 0.55 + 1.6, 0);
  addDecal(scene, fe, '#ffcf8a', 0.9, 0.25, 1.9, 1.8, 3.1 + 0.9, S + 0.006, -0.6, Math.PI / 2);
  addDecal(scene, fe, '#ffcf8a', 0.9, 0.25, 2.0, 1.5, -3.9 - 0.75, S + 0.006, -2.5, -Math.PI / 2);
  addDecal(scene, fe, '#ff5a6a', 0.9, 0.28, 0.9, 1.4, 3.55 + 0.7, S + 0.006, -3.75, Math.PI / 2);
  addDecal(scene, fe, '#5aa8ff', 0.9, 0.28, 0.9, 1.4, 3.55 + 0.7, S + 0.006, -2.85, Math.PI / 2);
  addDecal(scene, fe, '#9ff5d0', 0.9, 0.28, 0.9, 1.4, 3.55 + 0.7, S + 0.006, -1.95, Math.PI / 2);
  addDecal(scene, rd, '#ffd9a0', 0.9, 0.26, 2.2, 2.2, 4.5, S + 0.007, 0.6, 0);
  addDecal(scene, rd, '#ffd9a0', 0.9, 0.30, 3.2, 3.2, 6.5, 0.02, 0.6, 0);
  addDecal(scene, rd, '#ffd9a0', 0.9, 0.26, 2.2, 2.2, -4.2, S + 0.007, 3.6, 0);
  addDecal(scene, rd, '#ffd9a0', 0.9, 0.30, 3.2, 3.2, -4.2, 0.02, 5.6, 0);
  addDecal(scene, rd, '#ff5a3c', 0.9, 0.32, 2.6, 2.6, -4.75, S + 0.008, -4.2, 0);
  addDecal(scene, rd, '#ff4fa3', 0.9, 0.22, 2.0, 2.0, -4.75, S + 0.009, -3.2, 0);
  addDecal(scene, fe, '#ffd9a0', 0.9, 0.25, 0.6, 2.5, -4.2, 0.024, 6.6, Math.PI);
  addDecal(scene, fe, '#ffd9a0', 0.9, 0.25, 0.6, 2.5, 6.6, 0.024, 1.8, -Math.PI / 2);
  addDecal(scene, rd, '#6a8cff', 0.9, 0.20, 6.5, 2.6, 1.2, 0.026, 6.5, 0);

  const under = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: rd, color: new THREE.Color('#6a4cff').multiplyScalar(1.0), transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  under.position.y = -1.3; under.userData.noOutline = true;
  scene.add(under);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: rd, color: '#000000', transparent: true, opacity: 0.55, depthWrite: false,
  }));
  shadow.position.y = -1.2; shadow.userData.noOutline = true;
  scene.add(shadow);
}

/** 路灯的体积光锥 */
export function buildCones(scene, lamps) {
  const tex = coneTex();
  for (const l of lamps) {
    const h = l.y - 0.18;
    const m = new THREE.MeshBasicMaterial({
      map: tex, color: new THREE.Color('#ffdca0').multiplyScalar(0.95), transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.35, h, 28, 1, true), m);
    cone.position.set(l.x, l.y - h / 2, l.z);
    cone.userData.noOutline = true;
    glowList.push({ mat: m, base: m.color.clone(), opacity: 0.14 });
    m.userData.fadeWithLight = true;
    scene.add(cone);
  }
}

/** 每帧更新：天气过渡、雨、涟漪、薄雾、树木随风摇曳、闪电雷光 */
export function updateFx(time, introFade, dt = 0.016) {
  // 自动在夜雨 → 雷雨 → 微雨之间缓慢流转
  if (autoCycle && time > 12) {
    const cyc = ((time - 12) % 48);
    currentPresetIdx = cyc < 18 ? 1 : cyc < 32 ? 2 : 0;
  }
  const target = WEATHER_PRESETS[currentPresetIdx];
  const lerpK = Math.min(1, dt * 1.8);
  weatherState.rain += (target.rain - weatherState.rain) * lerpK;
  weatherState.wind += (target.wind - weatherState.wind) * lerpK;
  weatherState.slant += (target.slant - weatherState.slant) * lerpK;
  weatherState.mist += (target.mist - weatherState.mist) * lerpK;
  weatherState.stars += (target.stars - weatherState.stars) * lerpK;

  const effRain = weatherState.rain * introFade;
  const effWind = weatherState.wind * introFade;
  updateRainAudio(effRain, effWind);

  // 雨丝参数更新
  for (const u of rainUniforms) {
    u.uTime.value = time;
    u.uFade.value = Math.min(1.25, effRain);
    if (!u.isDrip) {
      u.uSlant.value = weatherState.slant + Math.sin(time * 1.7) * 0.025 * weatherState.wind;
      u.uLen.value = u.baseLen * (0.75 + 0.35 * weatherState.rain);
    }
  }

  // 积水涟漪更新
  for (const r of ripples) {
    const d = r.userData.ripple;
    const sp = d.speed * (0.65 + 0.55 * weatherState.rain);
    const k = (time * sp + d.phase) % 1;
    r.visible = effRain > 0.02;
    const s = 0.04 + d.max * k;
    r.scale.set(s, 1, s);
    r.material.opacity = (1 - k) * (1 - k) * 0.72 * Math.min(1.2, effRain);
  }

  // 贴地薄雾漂浮
  for (const m of mistMeshes) {
    m.material.opacity = weatherState.mist * introFade * (0.75 + 0.25 * Math.sin(time * 0.8 + m.userData.phase));
    m.position.x = m.userData.baseX + Math.sin(time * 0.45 + m.userData.phase) * 0.45;
  }

  // 星群闪烁
  if (starsMesh) {
    starsMesh.material.opacity = weatherState.stars * introFade * (0.8 + 0.2 * Math.sin(time * 2.5));
    starsMesh.rotation.y = time * 0.008;
  }

  // 树木与灌木随风轻微摇曳
  for (let i = 0; i < swayObjects.length; i++) {
    const obj = swayObjects[i];
    if (introFade > 0.95) {
      obj.rotation.z = Math.sin(time * 2.6 + i * 1.3) * 0.035 * weatherState.wind;
      obj.rotation.x = Math.cos(time * 2.1 + i * 0.9) * 0.022 * weatherState.wind;
    }
  }

  // 雷雨模式下定时触发闪电
  if (introFade > 0.95 && (target.storm || currentPresetIdx === 1) && time > nextBoltAt) {
    if (target.storm || Math.random() < 0.35) {
      triggerLightning(target.storm ? 1.0 : 0.65);
    }
    nextBoltAt = time + (target.storm ? 6.5 + Math.random() * 6 : 16 + Math.random() * 12);
  }

  // 闪电闪烁衰减（双脉冲雷光）
  let flash = 0;
  if (flashDecay > 0.005) {
    flashDecay = Math.max(0, flashDecay - dt * 3.2);
    const pulse = Math.sin(flashDecay * 22) > -0.2 ? 1 : 0.25;
    flash = flashDecay * pulse;
    if (lightningMat) lightningMat.opacity = flash > 0.35 ? flash : 0;
  } else if (lightningMat) {
    lightningMat.opacity = 0;
  }
  return flash;
}
