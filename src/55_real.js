
/* ============================== real assets (photo textures, HDR skies, rigged models) ============================== */
const ASSETS = { base: 'assets/', env: {}, envKey: null, clips: {}, models: {}, ready: false, progress: 0 };
// Character id -> rigged (Mixamo-style skeleton) glTF file in assets/. Any id from CAST works:
// anya, elise, steven, father, coach, ruth, dale, pruitt, marisol, bridget, tasha, nora, ghost, plus 'photoreal' for the custom student.
// Each one replaces the stylized model and is animated with the shared Mixamo library in assets/Xbot.glb.
const REAL_MODELS = {};
const texLoader = new THREE.TextureLoader(), rgbeLoader = new RGBELoader(), gltfLoader = new GLTFLoader();
const loadTex = (name, srgb = true) => new Promise(res => texLoader.load(ASSETS.base + name, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; res(t); }, undefined, () => res(null)));
// skies ship as tonemapped JPEG panoramas (artifact hosting doesn't serve .hdr)
const loadHDR = name => new Promise(res => texLoader.load(ASSETS.base + name, t => { t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; const rt = pmrem.fromEquirectangular(t); t.dispose(); res(rt.texture); }, undefined, () => res(null)));
const loadGLB = name => new Promise(res => gltfLoader.load(ASSETS.base + name, g => res(g), undefined, () => res(null)));
const setRep = (ts, x, y = x) => ts.forEach(t => t && t.repeat.set(x, y));

function setEnvIntensity(k) {
  scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.isMeshStandardMaterial) { if (m.userData.envBase == null) m.userData.envBase = m.envMapIntensity; m.envMapIntensity = m.userData.envBase * k; } });
}
// pick the HDR that matches the time of day (called from updateSky)
function hdrEnvFor(elevDeg) {
  if (!ASSETS.env.day) return false;
  const k = elevDeg > 9 ? 'day' : elevDeg > -6 ? 'dusk' : 'night';
  if (k !== ASSETS.envKey && ASSETS.env[k]) { ASSETS.envKey = k; scene.environment = ASSETS.env[k]; setEnvIntensity(k === 'night' ? .7 : k === 'dusk' ? .9 : .85); }
  return true;
}
// Keep the vertical component of the hip translation (the axis with the largest magnitude) and pin the other two.
function stripRootMotion(clip) {
  for (const tr of clip.tracks) if (/Hips\.position$/.test(tr.name)) {
    const v = tr.values, m = [0, 0, 0]; for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) m[k] += Math.abs(v[i + k]);
    const up = m.indexOf(Math.max(...m)); const f = [v[0], v[1], v[2]];
    for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) if (k !== up) v[i + k] = f[k];
  }
  clip.tracks = clip.tracks.filter(t => !/\.scale$/.test(t.name) && (!/\.position$/.test(t.name) || /Hips\.position$/.test(t.name)));
  return clip;
}
// Retarget a clip between two humanoid rigs that share bone names but not bone axes or units.
// Works in world space: each source bone's rotation away from its rest pose is applied to the target's rest pose.
function retargetClip(srcScene, dstScene, clip, fps = 30) {
  const src = SkeletonUtils.clone(srcScene), dst = SkeletonUtils.clone(dstScene);
  src.updateMatrixWorld(true); dst.updateMatrixWorld(true);
  const sb = {}, order = []; src.traverse(o => { if (o.isBone) sb[o.name] = o; }); dst.traverse(o => { if (o.isBone) order.push(o); });
  const restS = {}, restD = {}, Q = () => new THREE.Quaternion();
  for (const b of order) { restD[b.name] = b.getWorldQuaternion(Q()); if (sb[b.name]) restS[b.name] = sb[b.name].getWorldQuaternion(Q()); }
  const dstHips = order.find(b => /Hips$/.test(b.name)), srcHips = sb[dstHips?.name];
  const hipRestS = srcHips ? srcHips.getWorldPosition(new THREE.Vector3()) : null, hipRestD = dstHips.getWorldPosition(new THREE.Vector3());
  const ratio = hipRestS ? hipRestD.y / hipRestS.y : 1;
  const mixer = new THREE.AnimationMixer(src); mixer.clipAction(clip).play();
  const n = Math.max(2, Math.round(clip.duration * fps) + 1), times = new Float32Array(n);
  const vals = {}; for (const b of order) vals[b.name] = new Float32Array(n * 4);
  const hipPos = new Float32Array(n * 3);
  const world = {}, pw = Q(), tmp = Q(), wp = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) * clip.duration; times[i] = t; mixer.setTime(t); src.updateMatrixWorld(true);
    for (const b of order) {
      const parentWorld = b.parent && b.parent.isBone ? world[b.parent.name] : b.parent.getWorldQuaternion(pw.clone());
      let W;
      if (sb[b.name]) { W = sb[b.name].getWorldQuaternion(Q()).multiply(tmp.copy(restS[b.name]).invert()).multiply(restD[b.name]); }
      else W = parentWorld.clone().multiply(b.quaternion);
      world[b.name] = W;
      const local = parentWorld.clone().invert().multiply(W);
      local.toArray(vals[b.name], i * 4);
    }
    if (srcHips) { srcHips.getWorldPosition(wp); const dy = (wp.y - hipRestS.y) * ratio; const target = hipRestD.clone(); target.y += dy; dstHips.parent.worldToLocal(target); target.toArray(hipPos, i * 3); }
  }
  const tracks = order.map(b => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, vals[b.name]));
  if (srcHips) tracks.push(new THREE.VectorKeyframeTrack(dstHips.name + '.position', times, hipPos));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
async function loadAssets(onProgress) {
  let done = 0; const total = 13 + 2 + PEOPLE_IDS.length; const tick = () => { done++; ASSETS.progress = done / total; onProgress && onProgress(ASSETS.progress); };
  const T = (n, s) => loadTex(n, s).then(t => { tick(); return t; });
  // textures
  const [bd, bb, br, wd, wb, wr, gd, gn, wn] = await Promise.all([T('brick_diffuse.jpg'), T('brick_bump.jpg', false), T('brick_roughness.jpg', false), T('hardwood2_diffuse.jpg'), T('hardwood2_bump.jpg', false), T('hardwood2_roughness.jpg', false), T('grasslight-big.jpg'), T('grasslight-big-nm.jpg', false), T('waternormals.jpg', false)]);
  if (bd) { setRep([bd, bb, br], .64); Object.assign(MAT.brick, { map: bd, bumpMap: bb || null, bumpScale: 4, roughnessMap: br || null, roughness: 1, color: new THREE.Color(0xe6dcd4) }); MAT.brick.needsUpdate = true; }
  if (wd) {
    setRep([wd, wb, wr], 1, 2); Object.assign(MAT.wood, { map: wd, bumpMap: wb || null, bumpScale: 1.5, roughnessMap: wr || null, roughness: .9 }); MAT.wood.needsUpdate = true;
    const cd = wd.clone(), cb = wb && wb.clone(), cr = wr && wr.clone(); setRep([cd, cb, cr], 21, 32); [cd, cb, cr].forEach(t => t && (t.needsUpdate = true));
    Object.assign(MAT.court, { map: cd, bumpMap: cb || null, bumpScale: 1, roughnessMap: cr || null, roughness: .55, color: new THREE.Color(0xf0d8b8) }); MAT.court.needsUpdate = true;
  }
  if (gd) { const tm = World.terrainMat; tm.map = gd; if (gn) { tm.normalMap = gn; tm.normalScale = new THREE.Vector2(.8, .8); } tm.needsUpdate = true; recolorTerrain(true); }
  if (wn) { MAT.water.normalMap = wn; MAT.water.normalScale.set(.6, .6); MAT.water.needsUpdate = true; if (Anomaly.redWater) Anomaly.redWater.normalMap = wn; TEX.water = wn; }
  // skies
  const [eDay, eDusk, eNight] = await Promise.all(['sky_day.jpg', 'sky_dusk.jpg', 'sky_night.jpg'].map(n => loadHDR(n).then(t => { tick(); return t; })));
  Object.assign(ASSETS.env, { day: eDay, dusk: eDusk, night: eNight }); ASSETS.envKey = null;
  // realistic people (Rocketbox avatars + motion capture), streamed in one by one; mannequins stay until each arrives
  await loadPeople(tick);
  // animation library (Mixamo rig) for any extra user-supplied models in REAL_MODELS
  const entries = Object.entries(REAL_MODELS);
  if (entries.length) {
    ASSETS.bot = await loadGLB('Xbot.glb');
    for (const [id, file] of entries) { const m = await loadGLB(file); if (m) { prepareModel(m); ASSETS.models[id] = m; applyRealModel(id, m); } }
  }
  tick();
  ASSETS.ready = true;
  if (wd && World.courtDecal) World.courtDecal.visible = true;
  tick();
  updateSky(true);
  return ASSETS.ready;
}
function applyRealModel(id, m) {
  if (CAST[id]) CAST[id].spec.real = id;
  // every NPC built from this spec (story cast, students, the menu girl) swaps to the realistic body
  for (const n of NPCList) {
    if ((n.def.spec.real || n.id) !== id || n.char.real) continue;
    n.def.spec.real = id;
    const old = n.char, vis = old.root.visible; n.char = makeCharacter(n.def.spec); scene.add(n.char.root); n.char.root.visible = vis;
    n.char.root.position.copy(old.root.position); n.char.root.rotation.y = old.root.rotation.y;
    if (n.id === 'ghost') n.char.setOpacity(.92); old.dispose();
  }
  upgradePlayerChar();
  if (typeof preview !== 'undefined' && preview && !preview.real && preview.spec.real === id) setPreview(preview.spec);
  if (Game.state === 'custom' && /^custom_/.test(id)) refreshCustom();
  void m;
}
// swap the player's mannequin for the realistic body once it has loaded (not while driving)
function upgradePlayerChar() {
  const ch = Player.char; if (!ch || ch.real || Player.car || Game.state !== 'play') return;
  const spec = specFor(Game.role); if (!spec.real || !ASSETS.models[spec.real]) return;
  const p = Player.pos.clone(), y = Player.yaw, vis = ch.root.visible; setPlayerChar(spec); Player.char.root.position.copy(p); Player.char.root.rotation.y = y; Player.char.root.visible = vis;
}
// Give a loaded rig its own copies of the shared animation library.
function prepareModel(model) {
  const clips = {};
  if (ASSETS.bot) for (const c of ASSETS.bot.animations) if (['idle', 'walk', 'run', 'agree', 'headShake', 'sad_pose'].includes(c.name)) { try { clips[c.name] = retargetClip(ASSETS.bot.scene, model.scene, c); } catch (e) { console.warn('retarget failed', c.name, e); } }
  for (const c of model.animations) if (/samba|dance/i.test(c.name)) clips.dance = stripRootMotion(c.clone());
  model.userData.clips = clips;
}
function recolorTerrain(photo) {
  const g = World.terrainMesh.geometry, pos = g.attributes.position, col = g.attributes.color;
  const lawn = new THREE.Color(0xb9b49a), dry = new THREE.Color(0xc9a978), forest = new THREE.Color(0x6a5640), mud = new THREE.Color(0x5e5446), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm(x * .02, z * .02, 3) * .5 + .5, n2 = fbm(x * .07 + 9, z * .07, 2) * .5 + .5;
    c.copy(lawn).lerp(dry, smooth(.45, .9, n2) * .6 + n * .1).lerp(forest, clamp(treeDensity(x, z) * 1.1, 0, .9));
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z); c.lerp(mud, 1 - smooth(LAKE.r - 6, LAKE.r + 8, dl));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true; void photo;
}

/* ---------- rigged, animated characters (any Mixamo-rigged glTF) ---------- */
class RealCharacter {
  constructor(gltf, spec = {}) {
    this.spec = Object.assign({ fem: true, height: 1 }, spec); this.real = true; this.baseScale = 1;
    this.root = new THREE.Group(); this.mode = 'idle'; this.speed = 0; this.dance = 0; this.t = 0; this.phase = 0;
    const model = SkeletonUtils.clone(gltf.scene);
    model.updateMatrixWorld(true);
    let top = -1e9, bot = 1e9; const v = new THREE.Vector3();
    model.traverse(o => { if (o.isBone) { o.getWorldPosition(v); top = Math.max(top, v.y); bot = Math.min(bot, v.y); } });
    if (top < bot) { const box = new THREE.Box3().setFromObject(model); top = box.max.y; bot = box.min.y; }
    const k = 1.68 * (spec.scale || 1) / ((top - bot) || 1);
    model.scale.multiplyScalar(k); model.position.y -= bot * k; this.baseY = model.position.y;
    this.mats = [];
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = o.material.clone(); this.mats.push(o.material); if (o.material.map) o.material.map.anisotropy = maxAniso; } });
    this.root.add(model); this.model = model;
    this.bones = {}; model.traverse(o => { if (o.isBone) this.bones[o.name.replace(/^mixamorig:?/, '')] = o; });
    this.mixer = new THREE.AnimationMixer(model); this.actions = {}; this.w = {};
    const map = { idle: 'idle', walk: 'walk', run: 'run', dance: 'dance', sad: 'sad_pose', agree: 'agree', shake: 'headShake' };
    const lib = gltf.userData.clips || {};
    for (const [k2, name] of Object.entries(map)) { const clip = lib[name]; if (!clip) continue; const a = this.mixer.clipAction(clip); a.play(); a.setEffectiveWeight(k2 === 'idle' ? 1 : 0); this.actions[k2] = a; this.w[k2] = k2 === 'idle' ? 1 : 0; }
    this.root.traverse(m => { if (m.isMesh) m.userData.char = this; });
  }
  setOpacity(a) { for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; } }
  dispose() { this.root.removeFromParent(); this.mixer.stopAllAction(); this.mats.forEach(m => m.dispose()); }
  update(dt) {
    this.t += dt; const s = this.speed;
    if (s > .05) this.phase += dt * (3.2 + s * 1.35);
    const want = { idle: 0, walk: 0, run: 0, dance: 0, sad: 0, agree: 0, shake: 0 };
    if (this.mode === 'dance') want.dance = 1;
    else if (this.mode === 'ghost') { want.sad = this.actions.sad ? 1 : 0; want.idle = this.actions.sad ? 0 : 1; }
    else if (this.mode === 'talk') { want.idle = .65; want.agree = .35; }
    else if (this.mode === 'jump') want.run = 1;
    else { const r = clamp((s - .1) / 1.4, 0, 1), q = clamp((s - 2.4) / 2.2, 0, 1); want.idle = 1 - r; want.walk = r * (1 - q); want.run = r * q; }
    for (const [k, a] of Object.entries(this.actions)) { this.w[k] = damp(this.w[k], want[k] || 0, 8, dt); a.setEffectiveWeight(this.w[k]); }
    if (this.actions.walk) this.actions.walk.timeScale = clamp(s / 1.5, .7, 1.7);
    if (this.actions.run) this.actions.run.timeScale = clamp(s / 5, .8, 1.5);
    this.mixer.update(dt);
    const B = this.bones;
    const seated = this.mode === 'sit' || this.mode === 'drive';
    this.model.position.y = damp(this.model.position.y, this.baseY - (seated ? .46 : 0), 10, dt);
    if ((seated || this.mode === 'ghost') && B.LeftUpLeg) {
      this.model.updateMatrixWorld(true);
      const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()));
      const turn = (bone, ang) => { if (!bone) return; const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()); const r = new THREE.Quaternion().setFromAxisAngle(ax, ang); bone.quaternion.premultiply(pq.clone().invert().multiply(r).multiply(pq)); bone.updateMatrixWorld(true); };
      if (seated) {
        for (const sd of ['Left', 'Right']) { turn(B[sd + 'UpLeg'], -1.45); turn(B[sd + 'Leg'], 1.5); }
        if (this.mode === 'drive') for (const sd of ['Left', 'Right']) { turn(B[sd + 'Arm'], -.9); turn(B[sd + 'ForeArm'], -.4); }
      } else turn(B.Head, .5);
    }
  }
}

/* ---------- realistic people: Microsoft Rocketbox avatars (MIT) with Rocketbox motion capture ---------- */
// assets/people/<id>.glb, converted from the Rocketbox FBX files; anims_f / anims_m hold the shared clips.
const PEOPLE_IDS = ['anya', 'elise', 'steven', 'coach', 'nora', 'marisol', 'bridget', 'tasha', 'father', 'ruth', 'pruitt', 'dale', 'ghost',
  'kevin', 'lauren', 'marcus', 'priya', 'danny', 'jen', 'tom', 'sofia', 'custom_f', 'custom_m'];
const PEOPLE_MALE = new Set(['steven', 'father', 'dale', 'pruitt', 'kevin', 'marcus', 'danny', 'tom', 'custom_m']);
const PEOPLE_GAIT = { f: { walk: 1.21, run: 2.77 }, m: { walk: 1.01, run: 2.88 } }; // metres per second the clips were captured at
async function loadPeople(tick) {
  const [af, am] = await Promise.all([loadGLB('people/anims_f.glb'), loadGLB('people/anims_m.glb')]);
  tick(); tick();
  if (!af || !am) { PEOPLE_IDS.forEach(() => tick()); return; }
  ASSETS.anims = { f: af.animations, m: am.animations };
  // the player's own character first, then whoever is on screen, then everyone else
  const first = Game.role ? [Game.role === 'custom' ? 'custom_' + (Game.custom?.build || 'f') : Game.role] : [];
  const order = [...new Set([...first, ...PEOPLE_IDS])];
  for (const id of order) {
    const g = await loadGLB('people/' + id + '.glb'); tick();
    if (!g) continue;
    ASSETS.models[id] = preparePerson(g, PEOPLE_MALE.has(id) ? 'm' : 'f');
    applyRealModel(id, ASSETS.models[id]);
    await new Promise(r => setTimeout(r, 0));
  }
}
// Give one avatar its copies of the clips: the hip-height track is rescaled to this body, everything else is shared.
function preparePerson(gltf, sex) {
  const hips = gltf.scene.getObjectByName('Bip01'); const restY = hips ? hips.position.y : 92;
  const src = ASSETS.anims[sex], ref = (src.find(c => c.name === 'idle') || src[0]).tracks.find(t => t.name === 'Bip01.position');
  const refY = ref ? ref.values[1] : restY, k = restY / refY;
  const clips = {};
  for (const c of src) clips[c.name] = new THREE.AnimationClip(c.name, c.duration, c.tracks.filter(t => /^Bip01/.test(t.name)).map(t => {
    if (t.name !== 'Bip01.position') return t;
    const v = t.values.slice(); for (let i = 1; i < v.length; i += 3) v[i] *= k; return new THREE.VectorKeyframeTrack(t.name, t.times, v);
  }));
  return { rb: true, scene: gltf.scene, clips, sex, gait: PEOPLE_GAIT[sex] };
}
class PersonCharacter {
  constructor(entry, spec = {}) {
    this.spec = Object.assign({ fem: entry.sex === 'f', height: 1 }, spec); this.real = true; this.baseScale = 1;
    this.root = new THREE.Group(); this.mode = 'idle'; this.speed = 0; this.dance = 0; this.t = Math.random() * 20; this.phase = 0; this.look = 0;
    this.gait = entry.gait;
    const model = SkeletonUtils.clone(entry.scene);
    model.scale.setScalar(.01 * (this.spec.height || 1)); // Rocketbox works in centimetres
    this.mats = [];
    const ghost = spec.outfit === 'ghost';
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
        const c = m.clone();
        if (c.map) c.map.anisotropy = maxAniso;
        if (/opacity/i.test(c.name)) { c.transparent = false; c.alphaTest = .42; c.alphaToCoverage = true; c.side = THREE.DoubleSide; } // hair cards
        if (ghost) { c.color.set(/opacity/i.test(c.name) ? '#1a1a1e' : '#8c96a2'); c.emissive = new THREE.Color('#2c3646'); c.emissiveIntensity = .45; c.roughness = .25; }
        this.mats.push(c); return c;
      });
      if (o.material.length === 1) o.material = o.material[0];
    });
    this.root.add(model); this.model = model;
    this.bones = {}; model.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this.mixer = new THREE.AnimationMixer(model); this.actions = {}; this.w = {};
    for (const [k, clip] of Object.entries(entry.clips)) {
      const a = this.mixer.clipAction(clip); a.play(); a.time = Math.random() * clip.duration; a.setEffectiveWeight(k === 'idle' ? 1 : 0); this.actions[k] = a; this.w[k] = k === 'idle' ? 1 : 0;
    }
    this.lookT = 6 + Math.random() * 14; this.looking = 0;
    this.root.traverse(m => { if (m.isMesh) m.userData.char = this; });
  }
  setOpacity(a) { for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = true; } }
  dispose() { this.root.removeFromParent(); this.mixer.stopAllAction(); this.mats.forEach(m => m.dispose()); }
  update(dt) {
    this.t += dt; const s = this.speed, G = this.gait;
    if (s > .05) this.phase += dt * (3.2 + s * 1.35);
    const want = { idle: 0, look: 0, walk: 0, run: 0, talk: 0, dance: 0, sit: 0, sad: 0 };
    const seated = this.mode === 'sit' || this.mode === 'drive';
    if (this.mode === 'dance') want.dance = 1;
    else if (this.mode === 'ghost') want.sad = 1;
    else if (this.mode === 'talk') want.talk = 1;
    else if (seated) want.sit = 1;
    else if (this.mode === 'jump') want.run = 1;
    else {
      const r = clamp((s - .12) / .5, 0, 1), q = clamp((s - 1.7) / 1.1, 0, 1);
      want.walk = r * (1 - q); want.run = r * q;
      // now and then an idle person glances around
      if (r < .05) { this.lookT -= dt; if (this.lookT <= 0 && this.actions.look) { this.looking = this.actions.look.getClip().duration; this.actions.look.time = 0; this.lookT = 10 + Math.random() * 18; } } else this.looking = 0;
      if (this.looking > 0) this.looking -= dt;
      const lk = this.looking > .4 ? 1 : 0;
      want.look = (1 - r) * lk; want.idle = (1 - r) * (1 - lk);
    }
    for (const [k, a] of Object.entries(this.actions)) { this.w[k] = damp(this.w[k], want[k] || 0, k === 'walk' || k === 'run' ? 10 : 6, dt); a.setEffectiveWeight(this.w[k]); }
    if (this.actions.walk) this.actions.walk.timeScale = clamp(s / G.walk, .55, 1.9);
    if (this.actions.run) this.actions.run.timeScale = this.mode === 'jump' ? .6 : clamp(s / G.run, .7, 2.3);
    if (this.actions.dance) this.actions.dance.timeScale = 1;
    this.mixer.update(dt);
    // the sit clip carries the pelvis at chair height; line it up with the game's seats
    this.model.position.y = damp(this.model.position.y, seated ? -.1 : 0, 10, dt);
    if (this.mode === 'drive') this.reach();
  }
  // hands on the wheel: swing both arms forward around the character's own side axis
  reach() {
    const B = this.bones; if (!B.Bip01_L_UpperArm) return;
    this.model.updateMatrixWorld(true);
    const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()));
    const turn = (bone, ang) => { if (!bone) return; const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()); const r = new THREE.Quaternion().setFromAxisAngle(ax, ang); bone.quaternion.premultiply(pq.clone().invert().multiply(r).multiply(pq)); bone.updateMatrixWorld(true); };
    for (const sd of ['L', 'R']) { turn(B['Bip01_' + sd + '_UpperArm'], -.75); turn(B['Bip01_' + sd + '_Forearm'], -.35); }
  }
}
