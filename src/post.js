// 后期：三渲二描边（法线 + 深度）、移轴微缩模糊 + 暗角
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null },
    uTexel: { value: new THREE.Vector2() }, uNear: { value: 0.5 }, uFar: { value: 200 },
    uColor: { value: new THREE.Color('#0b0a26') }, uStrength: { value: 0.85 }, uThick: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tNormal, tDepth;
    uniform vec2 uTexel; uniform float uNear, uFar, uStrength, uThick;
    uniform vec3 uColor;
    varying vec2 vUv;
    float vz(float d) { return -perspectiveDepthToViewZ(d, uNear, uFar); }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 o = uTexel * uThick;
      vec2 uTL = vUv + vec2(-o.x, o.y), uTR = vUv + vec2(o.x, o.y), uBL = vUv + vec2(-o.x, -o.y), uBR = vUv + vec2(o.x, -o.y);
      float rTL = texture2D(tDepth, uTL).x, rTR = texture2D(tDepth, uTR).x, rBL = texture2D(tDepth, uBL).x, rBR = texture2D(tDepth, uBR).x;
      float rC = texture2D(tDepth, vUv).x;
      float sky = step(0.99999, max(max(rTL, rTR), max(max(rBL, rBR), rC)));
      float dTL = vz(rTL), dTR = vz(rTR), dBL = vz(rBL), dBR = vz(rBR), dC = vz(rC);
      float rd = (abs(dTL - dBR) + abs(dTR - dBL)) / max(dC, 1.0);
      vec3 nTL = texture2D(tNormal, uTL).xyz, nTR = texture2D(tNormal, uTR).xyz, nBL = texture2D(tNormal, uBL).xyz, nBR = texture2D(tNormal, uBR).xyz;
      float ne = length(nTL - nBR) + length(nTR - nBL);
      float line = max(smoothstep(0.012, 0.04, rd), smoothstep(0.45, 0.9, ne));
      line *= (1.0 - sky);
      gl_FragColor = vec4(mix(col.rgb, uColor, line * uStrength), col.a);
    }
  `,
};

const TiltShader = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uAmount: { value: 2.4 } },
  vertexShader: OutlineShader.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uAmount;
    varying vec2 vUv;
    void main() {
      float dy = abs(vUv.y - 0.5);
      float b = smoothstep(0.22, 0.52, dy) * uAmount;
      vec3 sum = texture2D(tDiffuse, vUv).rgb; float w = 1.0;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236 * 2.0;
        float r = (0.35 + 0.65 * fract(float(i) * 0.618)) * b;
        vec2 off = vec2(cos(a), sin(a)) * r * uTexel * 2.0;
        sum += texture2D(tDiffuse, vUv + off).rgb; w += 1.0;
      }
      vec3 c = sum / w;
      // 暗角 + 轻微夜色倾向
      vec2 q = vUv - 0.5;
      float vig = smoothstep(0.85, 0.2, length(q * vec2(1.0, 1.15)));
      c *= mix(0.55, 1.0, vig);
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  const normalRT = new THREE.WebGLRenderTarget(size.x, size.y, { depthTexture: new THREE.DepthTexture(size.x, size.y) });
  normalRT.depthTexture.type = THREE.UnsignedIntType;
  const normalMat = new THREE.MeshNormalMaterial();

  const outline = new ShaderPass(OutlineShader);
  outline.uniforms.tNormal.value = normalRT.texture;
  outline.uniforms.tDepth.value = normalRT.depthTexture;
  composer.addPass(outline);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.55, 1.08);
  composer.addPass(bloom);

  const tilt = new ShaderPass(TiltShader);
  composer.addPass(tilt);
  composer.addPass(new OutputPass());

  const hidden = [];
  let tagged = [];

  function refreshTagged() {
    tagged = [];
    scene.traverse((o) => { if (o.userData && o.userData.noOutline) tagged.push(o); });
  }

  function updateUniforms() {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    outline.uniforms.uTexel.value.set(1 / s.x, 1 / s.y);
    outline.uniforms.uNear.value = camera.near;
    outline.uniforms.uFar.value = camera.far;
    outline.uniforms.uThick.value = Math.max(1, renderer.getPixelRatio() * 0.75);
    tilt.uniforms.uTexel.value.set(1 / s.x, 1 / s.y);
  }
  updateUniforms();

  function render() {
    // 1) 法线 + 深度预渲染（隐藏玻璃、雨、光斑等不参与描边的物体）
    hidden.length = 0;
    for (const o of tagged) { if (o.visible) { hidden.push(o); o.visible = false; } }
    const bg = scene.background; scene.background = null;
    scene.overrideMaterial = normalMat;
    renderer.setRenderTarget(normalRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    scene.background = bg;
    for (const o of hidden) o.visible = true;
    renderer.setRenderTarget(null);
    // 2) 正式渲染 + 后期
    composer.render();
  }

  function resize(w, h) {
    composer.setSize(w, h);
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    normalRT.setSize(s.x, s.y);
    bloom.resolution.set(s.x, s.y);
    updateUniforms();
  }

  function isTagged(o) {
    return tagged.includes(o);
  }

  return { render, resize, refreshTagged, isTagged, bloom, outline };
}
