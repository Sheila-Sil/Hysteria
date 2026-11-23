
/* ============================== renderer & post ============================== */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2200);
camera.position.set(0, 20, 60);
const isTouch = matchMedia('(pointer: coarse)').matches;

const QUALITY = {
  low: { pr: .7, shadow: 0, bloom: false, msaa: 0, grass: .25, ao: false, label: 'Low' },
  medium: { pr: 1, shadow: 1024, bloom: true, msaa: 0, grass: .55, ao: false, label: 'Medium' },
  high: { pr: 1.5, shadow: 2048, bloom: true, msaa: 4, grass: 1, ao: true, label: 'High' },
  ultra: { pr: 2, shadow: 4096, bloom: true, msaa: 4, grass: 1.5, ao: true, label: 'Ultra' }
};
const settings = Object.assign({ quality: isTouch ? 'medium' : 'high', sens: 1, fov: 62, invert: false, grain: true }, store.get('settings', {}));

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: .05 }, uVig: { value: .9 }, uCA: { value: .0015 }, uHyst: { value: 0 }, uFlash: { value: 0 }, uCam: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uCA, uHyst, uFlash, uCam; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - .5;
      float glitch = step(.93, h(vec2(floor(uTime*12.), 7.))) * uHyst;
      uv.x += sin(uv.y*38. + uTime*5.) * .0035 * uHyst + (h(vec2(floor(uv.y*70.), floor(uTime*24.))) - .5) * .05 * glitch;
      uv.y += sin(uv.x*20. + uTime*3.) * .002 * uHyst;
      // camcorder: slight barrel + wobble
      uv += c * dot(c,c) * .08 * uCam; uv.x += sin(uv.y*400. + uTime*30.) * .0006 * uCam;
      float a = uCA + uHyst * .012 + uCam * .004;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * a).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * a).b;
      float l = dot(col, vec3(.299,.587,.114));
      col = mix(col, col * vec3(.9,1.0,1.08), (1. - l) * .35);       // cool shadows
      col = mix(col, col * vec3(1.06,1.0,.92), smoothstep(.5,1.,l) * .4); // warm highlights
      col = mix(col, vec3(l), uHyst * .45 + uCam * .25);
      col = mix(col, col * vec3(1.25,.72,.72), uHyst * .4);
      col += vec3(.0,.012,.02) * uCam;
      float v = smoothstep(.95, .25, length(c * vec2(1.05, 1.)));
      col *= mix(1., v, uVig + uHyst * .3);
      col *= 1. - uCam * .2 * step(.5, fract(uv.y * uRes.y * .5));        // scanlines
      col += (h(uv * uRes + fract(uTime) * 91.7) - .5) * (uGrain + uCam * .06 + uHyst * .05);
      col = mix(col, vec3(1.), uFlash);
      gl_FragColor = vec4(col, 1.);
    }`
};

let composer, renderPass, bloomPass, gradePass, outputPass, aoPass = null;
function buildComposer() {
  const q = QUALITY[settings.quality];
  const pr = Math.min(devicePixelRatio || 1, q.pr);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  const w = Math.floor(innerWidth * pr), h = Math.floor(innerHeight * pr);
  if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); }
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: q.msaa });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(w, h);
  renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  aoPass = null;
  if (q.ao) {
    aoPass = new GTAOPass(scene, camera, Math.floor(w * .5), Math.floor(h * .5));
    aoPass.updateGtaoMaterial({ radius: .9, distanceExponent: 1.2, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1 });
    aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    aoPass.blendIntensity = .9;
    // keep custom-shader grass, sky, sprites and particles out of the AO normal/depth pass
    const orig = aoPass.render.bind(aoPass); let noAO = [], noAOt = -1e9;
    aoPass.render = (...a) => {
      const now = performance.now();
      if (now - noAOt > 2000) { noAOt = now; noAO = []; scene.traverse(o => { const m = o.material; if (o === World.grass || o.isPoints || o.isSprite || (m && !Array.isArray(m) && (m.isShaderMaterial || m.blending === THREE.AdditiveBlending || (m.transparent && !m.alphaTest)))) noAO.push(o); }); }
      const vis = noAO.map(o => o.visible); noAO.forEach(o => o.visible = false); orig(...a); noAO.forEach((o, i) => o.visible = vis[i]);
    };
    composer.addPass(aoPass);
  }
  bloomPass = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), .55, .55, .82); bloomPass.enabled = q.bloom; composer.addPass(bloomPass);
  outputPass = new OutputPass(); composer.addPass(outputPass);
  gradePass = new ShaderPass(GradeShader); gradePass.uniforms.uRes.value.set(w, h); composer.addPass(gradePass);
}
function applyQuality() {
  const q = QUALITY[settings.quality];
  buildComposer();
  renderer.shadowMap.enabled = q.shadow > 0;
  if (sunLight) {
    sunLight.castShadow = q.shadow > 0;
    if (q.shadow > 0) { sunLight.shadow.mapSize.set(q.shadow, q.shadow); if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; } }
  }
  scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
  if (World.grass) World.grass.geometry.instanceCount = Math.floor(World.grassMax * Math.min(1, q.grass / 1.5));
  camera.fov = settings.fov; camera.updateProjectionMatrix();
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const q = QUALITY[settings.quality]; const pr = Math.min(devicePixelRatio || 1, q.pr);
  renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
  const w = Math.floor(innerWidth * pr), h = Math.floor(innerHeight * pr);
  composer.setSize(w, h); gradePass.uniforms.uRes.value.set(w, h);
});

/* ============================== sky, light & time ============================== */
const sky = new Sky(); sky.scale.setScalar(4500); scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 7; skyU.rayleigh.value = 1.6; skyU.mieCoefficient.value = .006; skyU.mieDirectionalG.value = .86;
const envScene = new THREE.Scene(); const envSky = new THREE.Mesh(sky.geometry, sky.material); envSky.scale.setScalar(4500); envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null, lastEnvElev = 999, lastEnvAt = -99;

const hemi = new THREE.HemisphereLight(0xbcd2ff, 0x3a3020, .6); scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffe0b0, 2.5);
sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 600;
const SH = 70; Object.assign(sunLight.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH });
sunLight.shadow.bias = -.0004; sunLight.shadow.normalBias = .04;
scene.add(sunLight); scene.add(sunLight.target);
scene.fog = new THREE.FogExp2(0x9aa3ad, .005);

// night dome: darkens the physical sky after dusk (and the environment map with it)
const nightDome = (() => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uNight: { value: 0 }, uHor: { value: new THREE.Color(0x121a2c) }, uZen: { value: new THREE.Color(0x02040a) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uNight; uniform vec3 uHor, uZen; varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0., 1.); vec3 c = mix(uHor, uZen, pow(h, .45)); gl_FragColor = vec4(c, uNight * smoothstep(-.25, .05, vDir.y) + uNight * (1. - smoothstep(-.25, .05, vDir.y))); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false
  });
  const d = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), m); d.renderOrder = -2; d.frustumCulled = false; scene.add(d);
  const e = new THREE.Mesh(d.geometry, m); envScene.add(e);
  return d;
})();
// stars & moon
const stars = (() => {
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random(), v = Math.random() * .95; const th = u * TAU, ph = Math.acos(1 - v); const r = 1650; pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); const b = .4 + Math.random() * .6; col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b * (1 + Math.random() * .2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const p = new THREE.Points(g, m); p.renderOrder = -1; p.frustumCulled = false; scene.add(p); return p;
})();
const moon = (() => {
  const t = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(.18, 'rgba(240,240,235,1)'); gr.addColorStop(.2, 'rgba(200,215,255,.35)'); gr.addColorStop(.5, 'rgba(140,160,220,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(160,160,170,.35)'; for (const [x, y, r] of [[118, 120, 8], [136, 134, 6], [124, 140, 4], [140, 116, 5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }, { repeat: false });
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
  m.scale.setScalar(320); m.renderOrder = -1; scene.add(m); return m;
})();

const TOD = { hour: 16.5, night: 0, elev: 0, sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), fogBoost: 0, fogDensity: .005 };
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const FOGC = { day: new THREE.Color(0xa9b4bf), dusk: new THREE.Color(0xb98a72), night: new THREE.Color(0x0d1320), blue: new THREE.Color(0x3a4a66) };
function updateSky(force = false) {
  const h = TOD.hour;
  const elevDeg = Math.sin((h - 6.3) / 12 * Math.PI) * 52;
  const az = THREE.MathUtils.degToRad(100 + (h - 6) * 13.5);
  TOD.elev = elevDeg;
  const el = THREE.MathUtils.degToRad(elevDeg);
  TOD.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const mel = THREE.MathUtils.degToRad(Math.max(18, -elevDeg * .8 + 10));
  TOD.moonDir.set(Math.cos(mel) * Math.sin(az + 2.6), Math.sin(mel), Math.cos(mel) * Math.cos(az + 2.6)).normalize();
  skyU.sunPosition.value.copy(TOD.sunDir);
  const night = TOD.night = 1 - smooth(-7, 3, elevDeg);
  const golden = smooth(-3, 4, elevDeg) * (1 - smooth(8, 26, elevDeg));
  skyU.rayleigh.value = lerp(1.4, 2.8, golden) * (1 - night * .5);
  skyU.turbidity.value = lerp(3.2, 9, golden); skyU.mieCoefficient.value = lerp(.0035, .007, golden);
  // light: sun by day, moon by night (same shadow caster)
  const dayK = smooth(-2, 6, elevDeg);
  const useMoon = elevDeg < -1.5;
  const dir = useMoon ? TOD.moonDir : TOD.sunDir;
  sunLight.userData.dir = dir;
  _c1.set(0xffa25a).lerp(_c2.set(0xfff1dc), smooth(2, 30, elevDeg));
  if (useMoon) sunLight.color.set(0x7f97d6); else sunLight.color.copy(_c1);
  sunLight.intensity = useMoon ? .5 * night : 2.6 * dayK;
  hemi.intensity = lerp(.16, .5, dayK) + golden * .05;
  hemi.color.set(useMoon ? 0x3d4f80 : 0xbcd2ff).lerp(_c2.set(0xffc39a), golden * .6);
  hemi.groundColor.set(useMoon ? 0x0d0f16 : 0x3a3020);
  stars.material.opacity = smooth(.55, 1, night) * .95;
  moon.position.copy(TOD.moonDir).multiplyScalar(1600); nightDome.material.uniforms.uNight.value = smooth(.15, .95, night) * .97;
  moon.material.opacity = smooth(.3, .9, night);
  renderer.toneMappingExposure = lerp(1.0, 1.12, night) * lerp(1, .92, golden);
  // fog
  const fc = scene.fog.color;
  fc.copy(FOGC.day).lerp(FOGC.dusk, golden).lerp(FOGC.blue, smooth(-2, -6, elevDeg) * .7 + smooth(0, -2, elevDeg) * .3 * (1 - smooth(-6, -9, elevDeg))).lerp(FOGC.night, smooth(-5, -12, elevDeg));
  TOD.fogDensity = lerp(.0028, .0085, Math.max(golden * .6, night)) + TOD.fogBoost;
  if (bloomPass) { bloomPass.strength = lerp(.16, .48, night); bloomPass.threshold = lerp(.95, .82, night); }
  scene.fog.density = damp(scene.fog.density, TOD.fogDensity, 2, 1 / 60);
  if (force) scene.fog.density = TOD.fogDensity;
  // night lamps & windows
  World.setNight && World.setNight(night, golden);
  // environment map (rebuild when the sun moves noticeably)
  const now = performance.now() / 1000;
  if (typeof hdrEnvFor === 'function' && hdrEnvFor(elevDeg)) { /* photographed HDR skies drive lighting */ }
  else if (force || Math.abs(elevDeg - lastEnvElev) > 2 || (now - lastEnvAt > 30 && Math.abs(elevDeg - lastEnvElev) > .3)) {
    const old = envRT; envRT = pmrem.fromScene(envScene, 0, .1, 5000); scene.environment = envRT.texture; if (old) old.dispose();
    lastEnvElev = elevDeg; lastEnvAt = now;
  }
}
function setHour(h) { TOD.hour = ((h % 24) + 24) % 24; updateSky(true); }
function fmtTime(h) { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); const ap = hh >= 12 ? 'PM' : 'AM'; let h12 = hh % 12; if (h12 === 0) h12 = 12; return `${h12}:${String(mm).padStart(2, '0')} ${ap}`; }
