// 程序化音效系统（Web Audio API）：积木搭建声、便利店门铃、雨声风声、雷鸣
let ctx = null;
let master = null;
let streamDest = null;
let rainGain = null;
let rainFilter = null;
let windGain = null;
let muted = false;
let lastTickAt = 0;
let bgmNodes = [];

function ensureCtx() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  // 使用动态压缩器提升整体响度并防止峰值削波，让雨声、配乐、门铃与雷声饱满清晰
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 18;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.005;
  comp.release.value = 0.18;

  master = ctx.createGain();
  master.gain.value = 1.85;
  master.connect(comp);
  comp.connect(ctx.destination);
  if (ctx.createMediaStreamDestination) {
    streamDest = ctx.createMediaStreamDestination();
    comp.connect(streamDest);
  }
  setupRainLoop();
  return ctx;
}

/** 获取 WebAudio 混音输出流（用于录制含完整音效的宣传片视频） */
export function getAudioStream() {
  ensureCtx();
  return streamDest ? streamDest.stream : null;
}

/** 播放宣传片专属 Lo-Fi 雨夜电钢琴和弦背景音乐（纯 WebAudio 合成） */
export function playPromoBgm(duration = 25) {
  const c = ensureCtx();
  if (!c) return;
  // 清理旧的 BGM 节点
  for (const n of bgmNodes) {
    try { n.stop(); } catch {}
  }
  bgmNodes = [];

  const t0 = c.currentTime + 0.05;
  // 温暖治愈的日式雨夜爵士七和弦进行：Fmaj9 -> Em7 -> Dm9 -> Cmaj9
  const prog = [
    [174.61, 261.63, 329.63, 392.00, 440.00], // Fmaj9
    [164.81, 246.94, 293.66, 392.00, 493.88], // Em7
    [146.83, 220.00, 261.63, 329.63, 440.00], // Dm9
    [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
  ];
  const chordDur = 3.125; // 每个和弦约 3.125s，8 个小节刚好 25s
  const totalChords = Math.ceil(duration / chordDur);

  for (let bar = 0; bar < totalChords; bar++) {
    const chord = prog[bar % prog.length];
    const start = t0 + bar * chordDur;
    chord.forEach((freq, idx) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start + idx * 0.045);

      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, start);
      lp.frequency.exponentialRampToValueAtTime(380, start + chordDur * 0.95);

      const peak = idx === 0 ? 0.14 : 0.085;
      g.gain.setValueAtTime(0.0001, start + idx * 0.045);
      g.gain.linearRampToValueAtTime(peak, start + idx * 0.045 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.002, start + chordDur * 0.98);

      osc.connect(lp);
      lp.connect(g);
      g.connect(master);
      osc.start(start + idx * 0.045);
      osc.stop(start + chordDur);
      bgmNodes.push(osc);
    });

    // 轻柔的高音星光点缀音（Rhodes 泛音感）
    const bellNotes = [chord[4] * 2, chord[3] * 2, chord[2] * 2, chord[1] * 2];
    bellNotes.forEach((bf, bi) => {
      const bt = start + 0.55 + bi * 0.62;
      if (bt - t0 >= duration - 0.5) return;
      const bOsc = c.createOscillator();
      const bGain = c.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(bf, bt);
      bGain.gain.setValueAtTime(0.0001, bt);
      bGain.gain.linearRampToValueAtTime(0.048, bt + 0.02);
      bGain.gain.exponentialRampToValueAtTime(0.0001, bt + 0.95);
      bOsc.connect(bGain);
      bGain.connect(master);
      bOsc.start(bt);
      bOsc.stop(bt + 1.0);
      bgmNodes.push(bOsc);
    });
  }
}

function setupRainLoop() {
  const sr = ctx.sampleRate;
  const len = sr * 3;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.048;
      b2 = 0.950 * b2 + w * 0.095;
      b3 = 0.850 * b3 + w * 0.140;
      d[i] = (b0 + b1 + b2 + b3 + w * 0.08) * 0.35;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'bandpass';
  rainFilter.frequency.value = 1350;
  rainFilter.Q.value = 0.55;

  rainGain = ctx.createGain();
  rainGain.gain.value = 0.0001;

  // 轻柔低频风声层
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 280;
  windGain = ctx.createGain();
  windGain.gain.value = 0.0001;

  src.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(master);

  src.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);

  src.start();
}

/** 绑定用户交互以自动解锁音频上下文 */
export function initAudio() {
  const unlock = () => { ensureCtx(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('wheel', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  ensureCtx();
}

export function toggleMute() {
  ensureCtx();
  muted = !muted;
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0.0001 : 1.85, ctx.currentTime, 0.08);
  }
  return muted;
}

/** 积木搭建落位音效：温润清脆的木质/模型卡扣声，随高度略微升调 */
export function playBuildTick(heightNorm = 0.5, kind = 'block') {
  if (muted) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const now = performance.now();
  if (now - lastTickAt < 46) return;
  lastTickAt = now;

  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  const base = kind === 'base' ? 140 : kind === 'glass' ? 520 : 220 + heightNorm * 260;
  osc.type = kind === 'glass' ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(base * 0.75, t);
  osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.028);
  osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.065);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(kind === 'base' ? 0.24 : 0.15, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + 0.075);
}

/** 招牌与全城灯光点亮音效 */
export function playPowerOn() {
  if (muted) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime;
  const notes = [330, 440, 554.37, 659.25, 880];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.055);
    g.gain.setValueAtTime(0.0001, t + i * 0.055);
    g.gain.linearRampToValueAtTime(0.095, t + i * 0.055 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.055 + 0.55);
    osc.connect(g);
    g.connect(master);
    osc.start(t + i * 0.055);
    osc.stop(t + i * 0.055 + 0.6);
  });
}

/** 日式便利店经典迎宾门铃声（自动门开启时轻柔响起） */
export function playKonbiniChime() {
  if (muted) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime;
  // 轻柔的便利店六音迎宾旋律
  const seq = [
    [739.99, 0.00, 0.22], // F#5
    [587.33, 0.22, 0.22], // D5
    [440.00, 0.44, 0.22], // A4
    [587.33, 0.66, 0.22], // D5
    [659.25, 0.88, 0.24], // E5
    [880.00, 1.12, 0.52], // A5
  ];
  for (const [freq, delay, dur] of seq) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + delay);
    g.gain.setValueAtTime(0.0001, t + delay);
    g.gain.linearRampToValueAtTime(0.085, t + delay + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t + delay);
    osc.stop(t + delay + dur + 0.02);
  }
}

/** 远方闷雷声 */
export function playThunder(strength = 1.0) {
  if (muted) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + 0.28;
  const dur = 2.4;
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, sr * dur, sr);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < d.length; i++) {
    const u = i / d.length;
    const env = Math.sin(Math.min(1, u * 4.5) * Math.PI * 0.5) * Math.pow(1 - u, 1.5);
    const rumble = 0.6 + 0.4 * Math.sin(u * 26) * Math.cos(u * 13);
    v = 0.96 * v + (Math.random() * 2 - 1) * 0.18;
    d[i] = v * env * rumble;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(190, t);
  lp.frequency.exponentialRampToValueAtTime(65, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.32 * strength, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(lp);
  lp.connect(g);
  g.connect(master);
  src.start(t);
}

/** 每帧更新雨声与风声强度（0~1.5） */
export function updateRainAudio(rainAmount, windAmount = 0.3) {
  if (!ctx || !rainGain || ctx.state !== 'running') return;
  const targetRain = Math.max(0.0001, rainAmount * 0.22);
  const targetWind = Math.max(0.0001, windAmount * 0.16);
  rainGain.gain.setTargetAtTime(targetRain, ctx.currentTime, 0.12);
  rainFilter.frequency.setTargetAtTime(950 + rainAmount * 650, ctx.currentTime, 0.15);
  windGain.gain.setTargetAtTime(targetWind, ctx.currentTime, 0.15);
}
