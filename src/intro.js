// 入场动画：严格从下往上、由内而外、分层有序搭建，零穿模，配搭积木音效
import * as THREE from 'three';
import { playBuildTick, playPowerOn } from './audio.js';

// 六个严格递进的施工阶段（秒）：
// 1.底座 → 2.地面与道路 → 3.店内地板与陈设（敞开式搭建） → 4.便利店墙体玻璃 & 楼房逐层加盖 → 5.屋顶封顶与招牌雨棚 → 6.街角设施与电线
export const STAGES = {
  base:     [0.0, 1.2],
  ground:   [1.0, 2.5],
  interior: [2.3, 4.5],
  shell:    [4.2, 6.5],
  top:      [6.2, 7.8],
  street:   [7.5, 9.5],
};
const PART_DUR = 0.46;
export const INTRO_END = 9.8;

const parts = [];
let powerPlayed = false;

function addPart(obj, stage) {
  parts.push({
    obj, stage,
    pos: obj.position.clone(),
    rot: obj.rotation.clone(),
    scl: obj.scale.clone(),
    delay: 0, done: false, ticked: false,
    y: 0, x: 0, z: 0, h: 0.2, drop: 0.25, hNorm: 0.5,
  });
}

/** 登记一个物体参与入场动画；split=true 时，其直接子物体各自成为独立搭建单元 */
export function register(obj, stage, split = true) {
  if (split && obj.children.length > 0 && obj.isGroup) {
    for (const c of obj.children) addPart(c, stage);
  } else {
    addPart(obj, stage);
  }
}

/** 所有物体加入场景后调用：按高度（从下往上）和空间顺序（从后往前、从左往右）严格排序 */
export function finalizeIntro(scene) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const byStage = {};

  for (const p of parts) {
    box.setFromObject(p.obj);
    if (isFinite(box.min.y)) {
      box.getCenter(center);
      p.y = box.min.y;
      p.x = center.x;
      p.z = center.z;
      p.h = Math.max(0.05, box.max.y - box.min.y);
    }
    // 轻柔的垂直落位距离（薄地面件几乎贴地展开，立体件从正上方微距垂直扣入，绝不横飞穿模）
    p.drop = p.h < 0.08 ? 0.06 : Math.min(0.42, 0.12 + p.h * 0.22);
    (byStage[p.stage] ||= []).push(p);
  }

  for (const [stage, list] of Object.entries(byStage)) {
    const [t0, t1] = STAGES[stage];
    // 严格按底部高度 y 从低到高排序；同高度层内按 z（从后到前）和 x（从左到右）有序排列
    list.sort((a, b) => {
      const dy = Math.round(a.y * 5) - Math.round(b.y * 5);
      if (dy !== 0) return dy;
      const dz = Math.round(a.z * 2) - Math.round(b.z * 2);
      if (dz !== 0) return dz;
      return a.x - b.x;
    });
    const n = list.length;
    const span = Math.max(0.1, t1 - t0 - PART_DUR);
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 0;
      list[i].delay = t0 + k * span;
      list[i].hNorm = Math.min(1, Math.max(0, (list[i].y + 1) / 8));
    }
  }
  for (const p of parts) p.obj.visible = false;
}

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x) => {
  const c1 = 1.45, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

let allDone = false;
export function resetIntro() {
  allDone = false;
  powerPlayed = false;
  for (const p of parts) {
    p.done = false;
    p.ticked = false;
    p.obj.visible = false;
  }
}

export function updateIntro(t) {
  if (t >= 8.2 && !powerPlayed) {
    powerPlayed = true;
    playPowerOn();
  }
  if (allDone) return;
  let pending = 0;
  for (const p of parts) {
    if (p.done) continue;
    const u = (t - p.delay) / PART_DUR;
    if (u <= 0) { pending++; continue; }
    const o = p.obj;
    o.visible = true;
    if (!p.ticked && u > 0.08 && u < 0.9) {
      p.ticked = true;
      playBuildTick(p.hNorm, p.stage === 'base' ? 'base' : p.stage === 'top' ? 'glass' : 'block');
    }
    if (u >= 1) {
      o.position.copy(p.pos);
      o.rotation.copy(p.rot);
      o.scale.copy(p.scl);
      p.done = true;
      continue;
    }
    pending++;
    const ey = easeOutCubic(u);
    const sy = Math.max(0.01, easeOutBack(u));
    const sxz = Math.max(0.01, 0.88 + 0.12 * easeOutCubic(Math.min(1, u * 1.5)));
    // 锚定每个部件自身的几何中心 (p.x, p.z) 与底部高度 p.y 原地向上生长 + 微距垂直落位，彻底杜绝偏移与穿模
    o.position.set(
      p.pos.x + (p.x - p.pos.x) * (1 - sxz),
      p.pos.y + (p.y - p.pos.y) * (1 - sy) + p.drop * (1 - ey),
      p.pos.z + (p.z - p.pos.z) * (1 - sxz),
    );
    o.rotation.copy(p.rot);
    o.scale.set(p.scl.x * sxz, p.scl.y * sy, p.scl.z * sxz);
  }
  if (pending === 0) allDone = true;
}
